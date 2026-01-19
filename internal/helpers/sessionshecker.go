package helpers

import (
	"database/sql"
	"net/http"
)

func setCookie(sessionID string, w http.ResponseWriter) {
	// Create a cookie
	cookie := &http.Cookie{
		Name:     "id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
	}
	http.SetCookie(w, cookie)
}

func SetSession(username, sessionID string, w http.ResponseWriter, r *http.Request) {
	db, err := sql.Open("sqlite3", "./forum.db")
	if err != nil {
		http.Redirect(w, r, "/register", http.StatusFound)
		return
	}
	defer db.Close()

	// 1. Get user ID by username
	var userID int
	err = db.QueryRow(
		`SELECT id FROM users WHERE username = ?`,
		username,
	).Scan(&userID)

	if err != nil {
		http.Redirect(w, r, "/register", http.StatusFound)
		return
	}

	// 2. Insert session
	_, err = db.Exec(
		`INSERT INTO sessions (id, user_id) VALUES (?, ?)`,
		sessionID,
		userID,
	)
	if err != nil {
		http.Redirect(w, r, "/register", http.StatusFound)
		return
	}

	// 3. Set cookie
	setCookie(sessionID, w)
}

func SessionChecker(r *http.Request) (int, bool) {
	cookie, err := r.Cookie("id")
	if err != nil {
		return 0, false
	}

	db, err := sql.Open("sqlite3", "./forum.db")
	if err != nil {
		return 0, false
	}
	defer db.Close()

	var userID int
	err = db.QueryRow(
		`SELECT user_id FROM sessions WHERE id = ?`,
		cookie.Value,
	).Scan(&userID)

	if err != nil {
		return 0, false
	}

	return userID, true
}



