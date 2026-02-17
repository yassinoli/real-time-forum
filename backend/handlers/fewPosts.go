package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"

	"github.com/gofrs/uuid"
)
var rsps models.Resp
// GetPostsHandler returns paginated posts as JSON
func GetPostsHandler(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		
		// The OPTIONS method is a CORS preflight request used by the browser to check if
		//  access is allowed by the server.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodGet {
			rsps.Code = 405
			rsps.Error = "Method not allowed"
			utils.Respond(w, &rsps)
			return
		}

		// Check authentication
		_, _, err := GetUserFromSession(r, db)
		if err != nil {
			rsps.Code = 401
			rsps.Error = "Unauthorized"
			utils.Respond(w,&rsps)
			return
		}

		// Parse pagination parameters
		offset := 0
		limit := 20 // Default to 20 posts per page

		if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
			if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
				offset = parsedOffset
			}
		}

		if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
			if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
				limit = parsedLimit
			}
		}

		posts, err := GetAllPosts(db, offset, limit)
		if err != nil {
			rsps.Code = 500
			rsps.Error = fmt.Sprintf("Error fetching posts: %v", err)
			utils.Respond(w,&rsps)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(posts)
	}
}

// GetPostHandler returns a single post with comments as JSON
func GetPostHandler(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodGet {
			rsps.Code = 400
			rsps.Error =  "Method not allowed"
			utils.Respond(w,&rsps)
			return
		}

		// Check authentication
		_, _, err := GetUserFromSession(r, db)
		if err != nil {
			rsps.Code = 401
			rsps.Error = "Unauthorized"
			utils.Respond(w,&rsps)
			return
		}

		postIDStr := r.URL.Query().Get("id")
		if postIDStr == "" {
			rsps.Code = 400
			rsps.Error = "Post ID is required"
			utils.Respond(w,&rsps)
			return
		}

		post, err := GetPostByID(db, postIDStr)
		if err != nil {
			rsps.Code = 404
			rsps.Error =  fmt.Sprintf("Post not found: %v", err)
			utils.Respond(w,&rsps)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(post)
	}
}

// AddPost adds a new post to the database
func AddPost(db *sql.DB, userID string, title, content string, categoryIDs []int) (string, error) {
	title = strings.TrimSpace(title)
	content = strings.TrimSpace(content)

	if title == "" {
		return "", errors.New("title cannot be empty")
	}
	if content == "" {
		return "", errors.New("content cannot be empty")
	}
	if len(title) > 200 {
		return "", errors.New("title too long")
	}
	if len(content) > 5000 {
		return "", errors.New("content too long")
	}

	// Generate UUID for post
	postID, err := uuid.NewV4()
	if err != nil {
		return "", err
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	// Insert post
	_, err = tx.Exec(`
		INSERT INTO post (id, user_id, title, content)
		VALUES (?, ?, ?, ?)
	`, postID.String(), userID, title, content)
	if err != nil {
		return "", err
	}

	// Insert categories
	for _, catID := range categoryIDs {
		_, err = tx.Exec(`
			INSERT INTO post_category (post_id, category_id)
			VALUES (?, ?)
		`, postID.String(), catID)
		if err != nil {
			return "", err
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return "", err
	}

	return postID.String(), nil
}

// GetCategoryIDByName gets category ID by name, creates if doesn't exist
func GetCategoryIDByName(db *sql.DB, categoryName string) (int, error) {
	var categoryID int
	err := db.QueryRow(`
		SELECT id FROM category WHERE type = ?
	`, categoryName).Scan(&categoryID)

	if err == sql.ErrNoRows {
		// Category doesn't exist, create it
		result, err := db.Exec(`
			INSERT INTO category (type) VALUES (?)
		`, categoryName)
		if err != nil {
			return 0, err
		}
		id, err := result.LastInsertId()
		if err != nil {
			return 0, err
		}
		return int(id), nil
	}

	if err != nil {
		return 0, err
	}

	return categoryID, nil
}

// GetPostByID gets a single post with its comments
func GetPostByID(db *sql.DB, postID string) (models.PostWithComments, error) {
	var post models.PostWithComments

	// Get post details
	row := db.QueryRow(`
		SELECT p.id, p.user_id, u.nickname, p.title, p.content, p.created_at
		FROM post p
		JOIN user u ON p.user_id = u.id
		WHERE p.id = ?
	`, postID)

	var createdAt time.Time
	err := row.Scan(&post.PostID, &post.UserID, &post.Username, &post.Title, &post.Content, &createdAt)
	if err != nil {
		return post, err
	}

	post.CreatedAt = createdAt.Format("Jan 02, 2006 15:04")

	// Get categories
	catRows, err := db.Query(`
		SELECT c.type
		FROM category c
		JOIN post_category pc ON c.id = pc.category_id
		WHERE pc.post_id = ?
	`, postID)
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

	// Get comments
	commentRows, err := db.Query(`
		SELECT c.id, u.nickname, u.id, c.content, c.created_at
		FROM comment c
		JOIN user u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		return post, err
	}
	defer commentRows.Close()

	for commentRows.Next() {
		var comment models.CommentWithUser
		var createdAt time.Time
		if err := commentRows.Scan(&comment.CommentID, &comment.Username, &comment.UserID, &comment.Content, &createdAt); err != nil {
			return post, err
		}
		comment.CreatedAt = createdAt.Format("Jan 02, 2006 15:04")
		post.Comments = append(post.Comments, comment)
	}

	post.CommentCount = len(post.Comments)

	return post, nil
}

// GetAllPosts gets paginated posts ordered by creation date (newest first)
func GetAllPosts(db *sql.DB, offset, limit int) ([]models.PostWithComments, error) {
	var posts []models.PostWithComments

	rows, err := db.Query(`
		SELECT p.id, p.user_id, u.nickname, p.title, p.content, p.created_at
		FROM post p
		JOIN user u ON p.user_id = u.id
		ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var post models.PostWithComments
		var createdAt time.Time
		err := rows.Scan(&post.PostID, &post.UserID, &post.Username, &post.Title, &post.Content, &createdAt)
		if err != nil {
			return nil, err
		}

		post.CreatedAt = createdAt.Format("Jan 02, 2006 15:04")

		// Get categories for this post
		catRows, err := db.Query(`
			SELECT c.type
			FROM category c
			JOIN post_category pc ON c.id = pc.category_id
			WHERE pc.post_id = ?
		`, post.PostID)
		if err != nil {
			return nil, err
		}

		for catRows.Next() {
			var category string
			if err := catRows.Scan(&category); err != nil {
				catRows.Close()
				return nil, err
			}
			post.Categories = append(post.Categories, category)
		}
		catRows.Close()

		// Get comment count
		post.CommentCount, _ = CountCommentsForPost(db, post.PostID)

		posts = append(posts, post)
	}

	return posts, nil
}

type Comment struct {
	CommentID string
	UserID    string
	PostID    string
	Content   string
}

// AddComment adds a new comment to the database
func AddComment(db *sql.DB, UserID string, PostID string, Content string) error {
	Content = strings.TrimSpace(Content)
	if Content == "" || len(Content) > 200 {
		return errors.New("void or to big comment")
	}

	commentID, err := uuid.NewV4()
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO comment (id, user_id, post_id, content)
		VALUES (?, ?, ?, ?)
	`, commentID.String(), UserID, PostID, Content)
	return err
}

// CountCommentsForPost counts the total number of comments for a post
func CountCommentsForPost(db *sql.DB, postID string) (int, error) {
	row := db.QueryRow(`
		SELECT COUNT(*)
		FROM comment
		WHERE post_id = ?
	`, postID)

	var count int
	err := row.Scan(&count)
	return count, err
}
