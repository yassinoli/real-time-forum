package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"
)

func LogoutHandler(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			utils.Respond(w, &models.Resp{
				Code:  405,
				Error: "method not allowed",
			})

			return
		}

		err := RemoveCookie(w, r, db, "")
		if err != nil {
			fmt.Println("error while removing the cookie: ", err)
			utils.Respond(w, &models.Resp{
				Code: 500,
				Error: "failed to logout. Please try later",
			})
			return
		}
	}
}

func RemoveCookie(w http.ResponseWriter, r *http.Request, db *sql.DB, user_id string) error {
	cookie, err := r.Cookie("session")
	if err != nil {
		return nil
	}

	if user_id != "" {
		_, err = db.Exec(`DELETE FROM session WHERE user_id = ?`, user_id)
		if err != nil {
			fmt.Println("failed to delete the session: ", err)
			return fmt.Errorf("something wrong happened. Please try later")
		}
	} else {
		session_ID := cookie.Value

		_, err = db.Exec(`DELETE FROM session WHERE id = ?`, session_ID)
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
