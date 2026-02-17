package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"real-time-forum/backend/models"
	"real-time-forum/backend/services"
	"real-time-forum/backend/utils"

	"github.com/gofrs/uuid"
)

func RegisterHandler(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {

		case http.MethodGet:
			utils.RenderMainpage(w)

		case http.MethodPost:
			Register(w, r, db)

		default:
			utils.Respond(w, &models.Resp{
				Code:  405,
				Error: "Method not allowed",
			})

		}
	}
}

func Register(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	user := &models.User{}
	resp := &models.Resp{
		Code: 200,
	}

	err := utils.GetData(r, user)
	if err != nil {
		utils.Respond(w, &models.Resp{Code: 500, Error: err.Error()})
		return
	}

	if !services.IsValidRegisterCredentials(user, resp) {
		resp.Code = 400
		utils.Respond(w, resp)
		return
	}

	user_id := services.InsertUser(user, resp, db)
	if user_id == uuid.Nil {
		utils.Respond(w, resp)
		return
	}

	err = services.CreateNewSession(w, db, user_id.String())
	if err != nil {
		utils.Respond(w, &models.Resp{Code: 500, Error: err.Error()})
		return
	}

	err = services.DeleteSession(w, r, db)
	if err != nil {
		fmt.Println("error while removing the session: ", err)
		utils.Respond(w, &models.Resp{Code: 500, Error: "Something wrong happened. Please try again"})
		return
	}

	utils.Respond(w, resp)
}
