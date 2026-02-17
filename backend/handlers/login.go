package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"real-time-forum/backend/models"
	"real-time-forum/backend/repositories/sqlite"
	"real-time-forum/backend/services"
	"real-time-forum/backend/utils"

	"golang.org/x/crypto/bcrypt"
)

func LoginHanlder(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {

		case http.MethodGet:
			_, _, err := GetUserFromSession(r, db)
			if err == nil {
				http.Redirect(w, r, "/posts", http.StatusSeeOther)
				return
			}

			utils.RenderMainpage(w)
		case http.MethodPost:
			Login(w, r, db)
		default:
			utils.Respond(w, &models.Resp{
				Code:  405,
				Error: "method not allowed",
			})
		}
	}
}

func Login(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	credentials := &models.Credentials{}
	resp := models.Resp{
		Code: 200,
	}

	err := utils.GetData(r, credentials)
	if err != nil {
		utils.Respond(w, &models.Resp{Code: 500, Error: err.Error()})
		return
	}

	if !services.IsValidLoginCredentials(credentials, &resp, r) {
		resp.Code = 400
		utils.Respond(w, &resp)
		return
	}

	storedPassword, user_id := sqlite.SelectPasswordAndID(db, &resp, credentials)
	if storedPassword == "" {
		utils.Respond(w, &resp)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(credentials.Password))
	if err != nil {
		utils.Respond(w, &models.Resp{Code: http.StatusUnauthorized, Error: "Invalid credentials"})
		return
	}

	err = services.DeleteSession(w, r, db)
	if err != nil {
		fmt.Println("error while removing the session: ", err)
		utils.Respond(w, &models.Resp{Code: 500, Error: "Something wrong happened. Please try again"})
		return
	}

	err = services.CreateNewSession(w, db, user_id)
	if err != nil {
		utils.Respond(w, &models.Resp{Code: 500, Error: err.Error()})
		return
	}

	utils.Respond(w, &resp)
}
