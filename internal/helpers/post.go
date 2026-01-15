package helpers

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

// AddPost adds a new post to the database
func AddPost(db *sql.DB, userID int, title, content string, categoryIDs []int) (int64, error) {
	title = strings.TrimSpace(title)
	content = strings.TrimSpace(content)

	if title == "" {
		return 0, errors.New("title cannot be empty")
	}
	if content == "" {
		return 0, errors.New("content cannot be empty")
	}
	if len(title) > 200 {
		return 0, errors.New("title too long")
	}
	if len(content) > 5000 {
		return 0, errors.New("content too long")
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Insert post
	result, err := tx.Exec(`
		INSERT INTO post (user_id, title, content)
		VALUES (?, ?, ?)
	`, userID, title, content)
	if err != nil {
		return 0, err
	}

	postID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	// Insert categories
	for _, catID := range categoryIDs {
		_, err = tx.Exec(`
			INSERT INTO post_category (post_id, category_id)
			VALUES (?, ?)
		`, postID, catID)
		if err != nil {
			return 0, err
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return 0, err
	}

	return postID, nil
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
func GetPostByID(db *sql.DB, postID int) (PostWithComments, error) {
	var post PostWithComments

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
		var comment CommentWithUser
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

// GetAllPosts gets all posts ordered by creation date (newest first)
func GetAllPosts(db *sql.DB) ([]PostWithComments, error) {
	var posts []PostWithComments

	rows, err := db.Query(`
		SELECT p.id, p.user_id, u.nickname, p.title, p.content, p.created_at
		FROM post p
		JOIN user u ON p.user_id = u.id
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var post PostWithComments
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

// PostWithComments represents a post with its comments
type PostWithComments struct {
	PostID       int                 `json:"postId"`
	UserID       int                 `json:"userId"`
	Username     string              `json:"username"`
	Title        string              `json:"title"`
	Content      string              `json:"content"`
	CreatedAt    string              `json:"createdAt"`
	Categories   []string            `json:"categories"`
	CommentCount int                 `json:"commentCount"`
	Comments     []CommentWithUser   `json:"comments,omitempty"`
}

// CommentWithUser represents a comment with user info
type CommentWithUser struct {
	CommentID int    `json:"commentId"`
	UserID    int    `json:"userId"`
	Username  string `json:"username"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
}