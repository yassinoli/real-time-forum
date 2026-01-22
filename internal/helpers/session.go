package helpers

import (
	"database/sql"
	"errors"
	"net/http"
)

// GetUserFromSession gets the user ID and nickname from the session cookie
// Returns userID (string), nickname (string), and error
func GetUserFromSession(r *http.Request, db *sql.DB) (string, string, error) {
	cookie, err := r.Cookie("session")
	if err != nil {
		return "", "", errors.New("unauthorized: no session cookie")
	}

	var userID, nickname string
	err = db.QueryRow(`
		SELECT u.id, u.nickname
		FROM user u
		JOIN session s ON s.user_id = u.id
		WHERE s.id = ? AND s.expire_at > datetime('now', 'localtime')
	`, cookie.Value).Scan(&userID, &nickname)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", "", errors.New("unauthorized: invalid or expired session")
		}
		return "", "", err
	}

	return userID, nickname, nil
}
