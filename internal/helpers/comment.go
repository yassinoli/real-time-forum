package helpers

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/gofrs/uuid"
)

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
