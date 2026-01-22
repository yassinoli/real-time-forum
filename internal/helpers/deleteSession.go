package helpers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"real-time-forum/internal/models"
)

func RemoveCookie(w http.ResponseWriter, r *http.Request, db *sql.DB, user_id string) error {
	cookie, err := r.Cookie("session")
	if err != nil { // no cookie
		return nil
	}

	if user_id != "" {
		_, err = db.Exec(models.Delete_session_by_user_id, user_id)
		if err != nil {
			fmt.Println("failed to delete the session: ", err)
			return fmt.Errorf("something wrong happened. Please try later")
		}
	} else {
		session_ID := cookie.Value

		_, err = db.Exec(models.Delete_session_by_id, session_ID)
		if err != nil {
			fmt.Println("failed to delete session: ", err)
			return fmt.Errorf("something wrong happened. Please try later")
		}
	}

	http.SetCookie(w, &http.Cookie{
		Name:    "session",
		Value:   "",
		Expires: time.Time{},
		MaxAge:  -1,
	})

	return nil
}
