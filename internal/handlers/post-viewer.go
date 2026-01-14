package handlers

import (
	"bytes"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"real-time-forum/internal/helpers"
	"real-time-forum/internal/models"
	"strconv"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// Handle post viewer
func (app *App) PostViewerHandler(w http.ResponseWriter, r *http.Request) {
	// Ensure GET method and Post
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		fmt.Printf("\033[43m [METHOD NOT ALLOWED] 405 \033[0m method not allowed: %s\n", r.Method)
		RenderErrorPage(app, w, r, errors.New("methode not allowed"), http.StatusMethodNotAllowed)
		return
	}

	// parse the post-viewer template file
	page, err := template.ParseFiles("./template/post-viewer.html")
	if err != nil {
		fmt.Printf("\033[41m [INTERNAL SERVER ERROR] 500 \033[0m failed to load post-viewer template: %v\n", err)
		RenderErrorPage(app, w, r, errors.New("error parsing template"), 500)
		return
	}

	// get post ID from query parameters
	idstr := r.URL.Query().Get("id")
	postID, err := strconv.Atoi(idstr)
	if err != nil {
		RenderErrorPage(app, w, r, errors.New("invalid post ID"), 400)
		return
	}

	// check user session
	userID, username, loggedIn := 1 , "yassin" , true //session(app, w, r)

	// get post with comments from the database
	post, err := GetPostWithComments(app, postID, userID)
	if err != nil {
		RenderErrorPage(app, w, r, errors.New("post not found"), 404)
		return
	}

	// check for ?error= in URL
	errorParam := r.URL.Query().Get("error")
	if errorParam != "" {
		post.CommentStatus = errorParam
	}

	// set additional post fields
	post.UserID = userID
	post.NickName = username
	post.LoggedIn = loggedIn

	var buf bytes.Buffer
	// execute the template with post data
	if err := page.Execute(&buf, post); err != nil {
		fmt.Printf("\033[41m [INTERNAL SERVER ERROR] 500 \033[0m failed to load viewer-post template: %v\n", err)
		RenderErrorPage(app, w, r, errors.New("error executing template"), 500)
		return
	}
	_, _ = w.Write(buf.Bytes())
}

// Get post along with its comments from the database
func GetPostWithComments(app *App, postID, userID int) (models.Post, error) {
	var post models.Post

	row := app.DB.QueryRow(`
		SELECT p.id, u.username, p.title, p.content, p.created_at
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.id = ?`, postID)

	var createdAt time.Time
	err := row.Scan(&post.PostID, &post.Username, &post.Title, &post.Content, &createdAt)
	if err != nil {
		return post, err
	}

	post.CreatedAt = createdAt.Format("Jan 02, 2006 15:04")
	post.CommentCount, _ = helpers.CountCommentsForPost(app.DB, postID)

	// Fetch categories
	catRows, err := app.DB.Query(`
        SELECT c.category
        FROM categories c
        JOIN post_categories pc ON c.id = pc.categories_id
        WHERE pc.post_id = ?`, postID)
	if err != nil {
		return post, err
	}
	defer catRows.Close()

	for catRows.Next() {
		var category string
		if err := catRows.Scan(&category); err != nil {
			return post, err
		}
		post.Categories = append(post.Categories, category)
	}



	// Fetch comments
	rows, err := app.DB.Query(`
		SELECT c.id, u.username, u.id, c.content, c.created_at
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?`, postID)
	if err != nil {
		return post, err
	}
	defer rows.Close()

	for rows.Next() {
		var timecomment time.Time
		var comment models.Comment
		if err := rows.Scan(&comment.CommentID, &comment.Username, &comment.UserID, &comment.Content, &timecomment); err != nil {
			return post, err
		}

		comment.Timed = timecomment.Format("Jan 02, 2006 15:04")

	
		post.Comments = append(post.Comments, comment)
	}

	return post, nil
}

// Handle adding comment
func (app *App) AddCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		fmt.Printf("\033[43m [METHOD NOT ALLOWED] 405 \033[0m method not allowed: %s\n", r.Method)
		RenderErrorPage(app, w, r, errors.New("methode not allowed"), http.StatusMethodNotAllowed)
		return
	}

	postIDStr := r.FormValue("post_id")
	content := strings.TrimSpace(r.FormValue("content"))

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		RenderErrorPage(app, w, r, errors.New("ID must be a number "), 400)
		return
	}

	userID, _, _ := 1 , 0 , 0//SessionChecker(app, w, r)

	if userID == 0 {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	if status := CheckComment(content); status != "" {
		http.Redirect(w, r, "/post-viewer?id="+postIDStr+"&error="+status, http.StatusSeeOther)
		return
	}

	if err := helpers.AddComment(app.DB, userID, &postID, content ); err != nil {
		log.Println("Error adding comment:", err)
	}
	http.Redirect(w, r, "/post-viewer?id="+postIDStr, http.StatusSeeOther)
}

// Handle post like/dislike
func (app *App) LikePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		fmt.Printf("\033[43m [METHOD NOT ALLOWED] 405 \033[0m method not allowed: %s\n", r.Method)
		RenderErrorPage(app, w, r, errors.New("method not allowed"), http.StatusMethodNotAllowed)
		return
	}

	postIDStr := r.FormValue("post_id")
	valueStr := r.FormValue("value")

	
	value, err := strconv.Atoi(valueStr)
	if err != nil || (value != 1 && value != -1) {
		RenderErrorPage(app, w, r, errors.New("value of like & dislike must be 1 or -1"), 400)
		return
	}

	userID, _, _ := 1,0,0 //SessionChecker(app, w, r)

	if userID == 0 {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	http.Redirect(w, r, "/post-viewer?id="+postIDStr, http.StatusSeeOther)
}

// andle like & dislike for comment
func (app *App) LikeCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		fmt.Printf("\033[43m [METHOD NOT ALLOWED] 405 \033[0m method not allowed: %s\n", r.Method)
		RenderErrorPage(app, w, r, errors.New("method not allowed"), http.StatusMethodNotAllowed)
		return
	}

	commentIDStr := r.FormValue("comment_id")
	valueStr := r.FormValue("value")

	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		RenderErrorPage(app, w, r, errors.New("invalid comment ID"), 400)
		return
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil || (value != 1 && value != -1) {
		RenderErrorPage(app, w, r, errors.New("invalid value of like or dislike , it must be -1 or 1 "), 400)
		return
	}

	userID, _, _ := 1,0,0//SessionChecker(app, w, r)

	if userID == 0 {

		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	// Get post_id for this comment from the DB
	var postID int
	err = app.DB.QueryRow("SELECT post_id FROM comments WHERE id = ?", commentID).Scan(&postID)
	if err != nil {
		log.Println("Error fetching post_id for comment:", err)
		RenderErrorPage(app, w, r, errors.New("comment not found"), 404)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/post-viewer?id=%d#comment-%d", postID, commentID), http.StatusSeeOther)
}

func CheckComment(content string) string {
	if content == "" {
		return "content void"
	}
	if len(content) > 200 {
		return "content to long"
	}
	return ""
}
