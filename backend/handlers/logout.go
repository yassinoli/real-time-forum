package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"real-time-forum/backend/models"
	"real-time-forum/backend/services"
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

		err := services.DeleteSession(w, r, db)
		if err != nil {
			fmt.Println("error while removing the session: ", err)
			utils.Respond(w, &models.Resp{
				Code:  500,
				Error: "Failed to logout. Please try later",
			})
			return
		}

		utils.Respond(w, &models.Resp{Code: 200})
	}
}
