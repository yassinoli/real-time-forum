package services

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"real-time-forum/backend/repositories/sqlite"

	"github.com/gofrs/uuid"
)

func CreateNewSession(w http.ResponseWriter, db *sql.DB, user_id string) error {
	session_id, err := uuid.NewV4()
	if err != nil {
		fmt.Println("error creating session id: ", err)
		return fmt.Errorf("something wrong happened. Please try later")
	}

	expireTime := time.Now().Add(24 * time.Hour)

	sqlite.InsertSession(db, session_id.String(), user_id, expireTime)

	cookie := &http.Cookie{
		Name:     "session",
		Value:    session_id.String(),
		Expires:  expireTime,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
	}

	http.SetCookie(w, cookie)
	return nil
}

func DeleteSession(w http.ResponseWriter, r *http.Request, db *sql.DB) error {
	cookie, err := r.Cookie("session")
	if err != nil {
		return nil
	}

	err = sqlite.RemoveSession(db, cookie.Value)
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Time{},
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
	})

	return nil
}
