package middleware

import (
	"database/sql"
	"net/http"

	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"
)

func IsloggedIn(w http.ResponseWriter, r *http.Request, db *sql.DB, nickname, userID *string) bool {
	cookie, err := r.Cookie("session")
	if err != nil {
		utils.Respond(w, &models.Resp{
			Code:  http.StatusUnauthorized,
			Error: "you need to login to access the chat",
		})
		return false
	}

	err = db.QueryRow(`
		SELECT u.nickname, u.id
		FROM user u
		JOIN session s ON s.user_id = u.id
		WHERE s.id = ?
	`, cookie.Value).Scan(nickname, userID)
	if err != nil {
		utils.Respond(w, &models.Resp{
			Code:  500,
			Error: "Something wrong happened, please try later",
		})

		return false
	}

	if *nickname == "" {
		utils.Respond(w, &models.Resp{
			Code:  http.StatusUnauthorized,
			Error: "you need to login to access the chat",
		})
		return false
	}

	return true
}
