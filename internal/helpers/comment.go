package helpers

import (
	"database/sql"
	"errors"
	"strings"
)

type Comment struct {
	CommentID int
	UserID    int
	PostID    *int
	Content   string
}

// AddComment adds a new comment to the database
func AddComment(db *sql.DB, UserID int, PostID *int, Content string) error {
	Content = strings.TrimSpace(Content)
	if Content == "" || len(Content) > 200 {
		return errors.New("void or to big comment")
	}
	_, err := db.Exec(`
		INSERT INTO comment (user_id, post_id, content)
		VALUES (?, ?, ?)
	`, UserID, PostID, Content)
	return err
}

// CountCommentsForPost counts the total number of comments for a post
func CountCommentsForPost(db *sql.DB, postID int) (int, error) {
	row := db.QueryRow(`
		SELECT COUNT(*)
		FROM comment
		WHERE post_id = ?
	`, postID)

	var count int
	err := row.Scan(&count)
	return count, err
}
