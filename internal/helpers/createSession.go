package helpers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"real-time-forum/internal/models"

	"github.com/gofrs/uuid"
)

func CreateNewSession(w http.ResponseWriter, db *sql.DB, user_id string) error {
	session_id, err := uuid.NewV4()
	if err != nil {
		fmt.Println("error creating session id: ", err)
		return fmt.Errorf("something wrong happened. Please try later")
	}

	expireTime := time.Now().Add(24 * time.Hour)
	_, err = db.Exec(models.Insert_session, session_id.String(), user_id, expireTime)
	if err != nil {
		fmt.Println("error inserting session's data:", err)
		return fmt.Errorf("something wrong happened. Please try later")
	}

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
