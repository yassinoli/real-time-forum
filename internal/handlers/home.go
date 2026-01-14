package handlers

import (
	"database/sql"
	"net/http"
)

type App struct {
	DB *sql.DB
}

func (a *App) HomeHanlder(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/register", http.StatusSeeOther)
}



/*

package route

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"

	"forum/helper"
	"forum/structs"
)

func (app *App) HomeHandler(w http.ResponseWriter, r *http.Request) {
	var user structs.UserLogInInfo

	// Check session
	user.UserID, user.Username, user.LoggedIn = SessionChecker(app, w, r)

	// Validate URL path || Check if devTool is Open
	if r.URL.Path != "/" && r.URL.Path != "/.well-known/appspecific/com.chrome.devtools.json" {
		fmt.Printf("\033[43;30m [NOT FOUND] 404 \033[0m page not found: %s\n", r.URL.Path)
		RenderErrorPage(app, w, r, errors.New("the page not found"), http.StatusNotFound)
		return
	}

	// Ensure GET method
	if r.Method != http.MethodGet {
		fmt.Printf("\033[43m [METHOD NOT ALLOWED] 405 \033[0m method not allowed: %s\n", r.Method)
		RenderErrorPage(app, w, r, errors.New("methode not allowed"), http.StatusMethodNotAllowed)
		return
	}

	// Parse form data
	cat := strings.TrimSpace(r.FormValue("cat"))
	pref := strings.TrimSpace(r.FormValue("pref"))

	// set default categories and preferences
	categories := map[string]bool{
		"AllCategories": true,
		"Gaming":        true,
		"General":       true,
		"Movies":        true,
		"Music":         true,
		"Sports":        true,
		"Technology":    true,
	}
	preferences := map[string]bool{
		"CreatedByMe": true,
		"LikedByMe":   true,
	}

	// make sure cat and pref have valid values
	if _, ok := categories[cat]; !ok {
		cat = "AllCategories"
	}

	if pref != "AllPosts" {
		if _, ok := preferences[pref]; !ok {
			pref = "AllPosts"
		}
	}

	// Fetch posts based on preference
	var Posts []structs.Posts_User
	var err error
	if pref == "AllPosts" {
		// Fetch all posts
		Posts, err = AllPoste(cat, app, w, r)
		if err != nil {
			RenderErrorPage(app, w, r, errors.New("error fetching posts "), http.StatusInternalServerError)
			return
		}
	} else {
		// check is user is logged in
		if !user.LoggedIn {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		// Fetch posts based on user preference
		var err error
		switch pref {
		case "LikedByMe":
			// Fetch posts liked by the user
			Posts, err = LikedByMe(app, cat, w, r, user.UserID)
			if err != nil {
				fmt.Printf("\033[41m [INTERNAL SERVER ERROR] 500 \033[0m error fetching liked posts: %v\n", err)
				RenderErrorPage(app, w, r, errors.New("error fetching liked posts"), http.StatusInternalServerError)
				return
			}

		case "CreatedByMe":
			// Fetch posts created by the user
			Posts, err = CreatByMe(app.DB, cat, w, r, user.UserID)
			if err != nil {
				fmt.Printf("\033[41m [INTERNAL SERVER ERROR] 500 \033[0m error fetching created posts: %v\n", err)
				RenderErrorPage(app, w, r, errors.New("error fetching created posts"), http.StatusInternalServerError)
				return
			}
		}
	}

	// Parse and execute template
	tmp, err := template.ParseFiles("./template/index.html")
	if err != nil {
		fmt.Printf("\033[41m [INTERNAL SERVER ERROR] 500 \033[0m error parsing template: %v\n", err)
		RenderErrorPage(app, w, r, errors.New("error parsing template"), http.StatusInternalServerError)
		return
	}

	// Determine the post number of the last post
	PostNumber := 0
	if len(Posts) > 0 {
		PostNumber = Posts[len(Posts)-1].PostNumber
	}

	// Check post like/dislike for each post for the logged-in user
	if user.LoggedIn {
		CheckPostLike(app, user.UserID, Posts)
		CountReaction(app, Posts, w, r)
	}
	// Render the page with posts
	var buf bytes.Buffer
	err = tmp.Execute(&buf, map[string]any{
		"Posts":       Posts,
		"PostsNumber": PostNumber,
		"User":        user,
		"Cat":         cat,
		"Pref":        pref,
	})
	if err != nil {
		fmt.Printf("\033[41m [INTERNAL SERVER ERROR] 500 \033[0m error executing template: %v\n", err)
		RenderErrorPage(app, w, r, errors.New("error executing template"), http.StatusInternalServerError)
		return
	}
	_, _ = w.Write(buf.Bytes())
}

func AllPoste(categorie string, app *App, w http.ResponseWriter, r *http.Request) ([]structs.Posts_User, error) {
	// define variables
	var posts []structs.Posts_User
	var categories structs.Categories
	var post structs.Posts_User
	var postIDs []int
	postNumber := 1

	if categorie != "AllCategories" {

		// fetch category ID for the given category name
		err := app.DB.QueryRow(`SELECT id , category FROM categories WHERE category = ?`, categorie).Scan(&categories.Id, &categories.Categorie)
		if err != nil {
			fmt.Printf("\033[41m [DB ERROR] \033[0m failed to fetch category %q: %v\n", categorie, err)
			return nil, err
		}

		// fetch post IDs for the category ID
		row, err := app.DB.Query(`SELECT post_id FROM post_categories WHERE categories_id = ? `, &categories.Id)
		if err != nil {
			fmt.Printf("\033[41m [DB ERROR] \033[0m failed to fetch post IDs for category ID %d: %v\n", categories.Id, err)
			return nil, err
		}

		defer row.Close()

		// collect post IDs into a slice
		for row.Next() {
			err = row.Scan(&post.Id)
			if err != nil {
				fmt.Printf("\033[41m [DB ERROR] \033[0m failed to scan post ID: %v\n", err)
				return nil, err
			}
			postIDs = append(postIDs, post.Id)
		}

		// fetch posts for the collected post IDs
		for i := 0; i < len(postIDs); i++ {
			rows, err := app.DB.Query(`
				SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at,
					(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = 1),
					(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = -1)
				FROM posts p
				LEFT JOIN users u ON p.user_id = u.id
				WHERE p.id=? ORDER BY p.created_at DESC`, postIDs[i])
			if err != nil {
				fmt.Printf("\033[41m [DB ERROR] \033[0m failed to fetch post details for post ID %d: %v\n", postIDs[i], err)
				return nil, err
			}

			defer rows.Close()
			for rows.Next() {
				err := rows.Scan(&post.Id, &post.UserId, &post.Username, &post.Title, &post.Content, &post.Created_at, &post.PostLikes, &post.PostDislike)
				if err != nil {
					fmt.Printf("\033[41m [DB ERROR] \033[0m failed to scan post details (post ID %d): %v\n", post.Id, err)
					return nil, err
				}

				// fetch categories for the post
				catRows, err := app.DB.Query(`SELECT c.category FROM categories c 
					INNER JOIN post_categories pc ON pc.categories_id=c.id 
					WHERE pc.post_id=?`, post.Id)
				if err != nil {
					fmt.Printf("\033[41m [DB ERROR] \033[0m failed to fetch categories for post ID %d: %v\n", post.Id, err)
					return nil, err
				}
				var cats []string
				for catRows.Next() {
					var c string
					catRows.Scan(&c)
					cats = append(cats, c)
				}
				post.Category = cats
				catRows.Close()
				post.PostNumber = postNumber
				postNumber++
				posts = append(posts, post)
			}
		}
	} else {
		// fetch all posts when category is "AllCategories"
		rows, err := app.DB.Query(`
			SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at,
				(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = 1),
				(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = -1)
			FROM posts p
			LEFT JOIN users u ON p.user_id = u.id
			ORDER BY p.created_at DESC`)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		for rows.Next() {
			err := rows.Scan(&post.Id, &post.UserId, &post.Username, &post.Title, &post.Content, &post.Created_at, &post.PostLikes, &post.PostDislike)
			if err != nil {
				fmt.Printf("\033[41m [DB ERROR] \033[0m failed to fetch all posts: %v\n", err)
				return nil, err
			}

			// fetch categories for the post
			catRows, err := app.DB.Query(`SELECT c.category FROM categories c 
				INNER JOIN post_categories pc ON pc.categories_id=c.id 
				WHERE pc.post_id=?`, post.Id)
			if err != nil {
				fmt.Printf("\033[41m [DB ERROR] \033[0m failed to fetch categories for post ID %d: %v\n", post.Id, err)
				return nil, err
			}

			var cats []string
			for catRows.Next() {
				var c string
				err = catRows.Scan(&c)
				if err != nil {
					fmt.Printf("\033[41m [DB ERROR] \033[0m failed to scan category for post ID %d: %v\n", post.Id, err)
					return nil, err
				}
				cats = append(cats, c)
			}
			post.Category = cats
			catRows.Close()
			post.PostNumber = postNumber
			postNumber++
			posts = append(posts, post)
		}
	}
	return posts, nil
}

func LikedByMe(app *App, categorie string, w http.ResponseWriter, r *http.Request, userID int) ([]structs.Posts_User, error) {
	var post structs.Posts_User
	var posts []structs.Posts_User
	var PostssLikesId []int
	var PostsCategoriesId []int
	var categories structs.Categories
	var likeCategorie []int
	postNumber := 1

	rows, err := app.DB.Query(`SELECT post_id FROM post_likes WHERE user_id = ? AND value = 1 `, userID)
	if err != nil {
		log.Fatal("Errorrows", err)
	}
	for rows.Next() {
		rows.Scan(&post.Id)
		PostssLikesId = append(PostssLikesId, post.Id)
	}
	if categorie != "AllCategories" {
		err := app.DB.QueryRow(`SELECT id , category FROM categories WHERE category = ?`, categorie).Scan(&categories.Id, &categories.Categorie)
		if err != nil {
			return nil, err
		}
		row, err := app.DB.Query(`SELECT post_id FROM post_categories WHERE categories_id = ? `, &categories.Id)
		if err != nil {
			return nil, err
		}
		for row.Next() {
			err = row.Scan(&post.Id)
			if err != nil {
				return nil, err
			}
			PostsCategoriesId = append(PostsCategoriesId, post.Id)
		}
		for i := 0; i < len(PostssLikesId); i++ {
			for j := 0; j < len(PostsCategoriesId); j++ {
				if PostssLikesId[i] == PostsCategoriesId[j] {
					likeCategorie = append(likeCategorie, PostssLikesId[i])
				}
			}
		}
		for i := 0; i < len(likeCategorie); i++ {
			row, err = app.DB.Query(`
				SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at,
					(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = 1),
					(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = -1)
				FROM posts p
				LEFT JOIN users u ON p.user_id = u.id
				WHERE p.id = ? ORDER BY p.created_at DESC`, likeCategorie[i])
			if err != nil {
				return nil, err
			}
			for row.Next() {
				err := row.Scan(&post.Id, &post.UserId, &post.Username, &post.Title, &post.Content, &post.Created_at, &post.PostLikes, &post.PostDislike)
				if err != nil {
					return nil, err
				}
				catRows, _ := app.DB.Query(`SELECT c.category FROM categories c 
					INNER JOIN post_categories pc ON pc.categories_id=c.id 
					WHERE pc.post_id=?`, post.Id)
				var cats []string
				for catRows.Next() {
					var c string
					catRows.Scan(&c)
					cats = append(cats, c)
				}
				post.Category = cats
				catRows.Close()
				post.PostNumber = postNumber
				postNumber++
				posts = append(posts, post)
			}
			defer row.Close()
		}
	} else {
		for i := 0; i < len(PostssLikesId); i++ {
			Prows, err := app.DB.Query(`
				SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at,
					(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = 1),
					(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = -1)
				FROM posts p
				LEFT JOIN users u ON p.user_id = u.id
				WHERE p.id = ? ORDER BY p.created_at DESC`, PostssLikesId[i])
			if err != nil {
				return nil, err
			}
			for Prows.Next() {
				var Str structs.Posts_User
				err := Prows.Scan(&Str.Id, &Str.UserId, &Str.Username, &Str.Title, &Str.Content, &Str.Created_at, &Str.PostLikes, &Str.PostDislike)
				if err != nil {
					return nil, err
				}
				catRows, _ := app.DB.Query(`SELECT c.category FROM categories c 
					INNER JOIN post_categories pc ON pc.categories_id=c.id 
					WHERE pc.post_id=?`, Str.Id)
				var cats []string
				for catRows.Next() {
					var c string
					catRows.Scan(&c)
					cats = append(cats, c)
				}
				Str.Category = cats
				catRows.Close()
				Str.PostNumber = postNumber
				postNumber++
				posts = append(posts, Str)
			}
			defer Prows.Close()
		}
	}
	return posts, nil
}

func CreatByMe(db *sql.DB, categorie string, w http.ResponseWriter, r *http.Request, userId int) ([]structs.Posts_User, error) {
	var post structs.Posts_User
	var posts []structs.Posts_User
	var postsIds []int
	var categories structs.Categories
	postNumber := 1
	if categorie != "AllCategories" {

		err := db.QueryRow(`SELECT id , category FROM categories WHERE category = ?`, categorie).Scan(&categories.Id, &categories.Categorie)
		if err != nil {
			return nil, err
		}

		row, err := db.Query(`SELECT post_id FROM post_categories WHERE categories_id = ?`, &categories.Id)
		if err != nil {
			return nil, err
		}

		defer row.Close()

		for row.Next() {
			err = row.Scan(&post.Id)
			if err != nil {
				return nil, err
			}
			postsIds = append(postsIds, post.Id)
		}

		//  Guard against empty slice before indexing
		if len(postsIds) == 0 {
			return []structs.Posts_User{}, nil
		}

		for i := 0; i < len(postsIds); i++ {
			rows, err := db.Query(`
				SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at,
					(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = 1),
					(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = -1)
				FROM posts p
				LEFT JOIN users u ON p.user_id = u.id
				WHERE p.id=? AND p.user_id=? ORDER BY p.created_at DESC`, postsIds[i], userId)
			if err != nil {
				return nil, err
			}
			defer rows.Close()

			for rows.Next() {
				var currentPost structs.Posts_User //  new variable per loop iteration
				err = rows.Scan(&currentPost.Id, &currentPost.UserId, &currentPost.Username, &currentPost.Title, &currentPost.Content, &currentPost.Created_at, &currentPost.PostLikes, &currentPost.PostDislike)
				if err != nil {
					return nil, err
				}
				catRows, err := db.Query(`SELECT c.category FROM categories c 
					INNER JOIN post_categories pc ON pc.categories_id=c.id 
					WHERE pc.post_id=?`, currentPost.Id)
				if err != nil {
					return nil, err
				}
				var cats []string
				for catRows.Next() {
					var c string
					catRows.Scan(&c)
					cats = append(cats, c)
				}
				catRows.Close()
				currentPost.Category = cats
				currentPost.PostNumber = postNumber
				postNumber++
				posts = append(posts, currentPost)
			}
		}
	} else {
		rows, err := db.Query(`
			SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at,
				(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = 1),
				(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND value = -1)
			FROM posts p
			LEFT JOIN users u ON p.user_id = u.id
			WHERE p.user_id = ? ORDER BY p.created_at DESC`, userId)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			var currentPost structs.Posts_User //  avoid reusing shared variable
			err := rows.Scan(&currentPost.Id, &currentPost.UserId, &currentPost.Username, &currentPost.Title, &currentPost.Content, &currentPost.Created_at, &currentPost.PostLikes, &currentPost.PostDislike)
			if err != nil {
				return nil, err
			}
			catRows, err := db.Query(`SELECT c.category FROM categories c 
				INNER JOIN post_categories pc ON pc.categories_id=c.id 
				WHERE pc.post_id=?`, currentPost.Id)
			if err != nil {
				return nil, err
			}
			var cats []string
			for catRows.Next() {
				var c string
				catRows.Scan(&c)
				cats = append(cats, c)
			}
			catRows.Close()
			currentPost.Category = cats
			currentPost.PostNumber = postNumber
			postNumber++
			posts = append(posts, currentPost)
		}
	}

	return posts, nil
}

// Handle post like/dislike
func (app *App) LikePostHandlerHome(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		fmt.Printf("\033[43m [METHOD NOT ALLOWED] 405 \033[0m method not allowed: %s\n", r.Method)
		RenderErrorPage(app, w, r, errors.New("method not allowed"), http.StatusMethodNotAllowed)
		return
	}

	postIDStr := r.FormValue("post_id")
	valueStr := r.FormValue("value")

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		RenderErrorPage(app, w, r, errors.New("ID must be a number "), 400)
		return
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil || (value != 1 && value != -1) {
		RenderErrorPage(app, w, r, errors.New("value of like & dislike must be 1 or -1"), 400)
		return
	}

	userID, _, _ := SessionChecker(app, w, r)

	if userID == 0 {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	err = helper.LikePost(app.DB, userID, postID, value, app.WriterMutex)
	if err != nil {
		RenderErrorPage(app, w, r, err, 500)
		http.Error(w, "Failed to like post", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, fmt.Sprintf("%s#post-%d", r.Header.Get("Referer"), postID), http.StatusSeeOther)
}

// this func check if user like a specefic post
// to change style in like button from white to black
func CheckPostLike(app *App, userId int, posts []structs.Posts_User) {
	if userId != 0 {
		for i := range posts {
			var value int
			err := app.DB.QueryRow(`
				SELECT value FROM post_likes WHERE user_id = ? AND post_id = ?
				`, userId, posts[i].Id).Scan(&value)
			if err == nil {
				switch value {
				case 1:
					posts[i].IsLiked = true
				case -1:
					posts[i].IsDisliked = true
				}
			}
		}
	}
}

// count like , dislike & comment for each post
func CountReaction(app *App, posts []structs.Posts_User, w http.ResponseWriter, r *http.Request) {
	for i := range posts {
		likes, dislikes, err := helper.CountLikesForPost(app.DB, posts[i].Id)
		if err != nil {
			RenderErrorPage(app, w, r, errors.New("failled to count likes for this post"), 500)
			return
		}
		Comment, err := helper.CountCommentsForPost(app.DB, posts[i].Id)
		if err != nil {
			RenderErrorPage(app, w, r, errors.New("failed to count comment for this post"), 500)
			return
		}
		posts[i].CountComment = Comment
		posts[i].PostLikes = likes
		posts[i].PostDislike = dislikes
	}
}


*/