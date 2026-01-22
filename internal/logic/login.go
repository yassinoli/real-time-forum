package logic

import (
	"database/sql"
	"fmt"
	"net/http"

	"real-time-forum/internal/helpers"
	"real-time-forum/internal/models"

	"golang.org/x/crypto/bcrypt"
)

func getPassowrdAndID(credentials *models.Credentials, resp *models.Resp, db *sql.DB) (string, string) {
	var storedPassword string
	var user_id string

	if credentials.Nickname != "" {
		err := db.QueryRow(models.Select_password_by_nickname, credentials.Nickname).Scan(&storedPassword, &user_id)

		if err == sql.ErrNoRows {
			resp.Error = "invalid credentials"
			resp.Code = http.StatusUnauthorized
			return "", ""

		} else if err != nil {
			fmt.Println("error while getting data by nickname: ", err)
			resp.Error = "something wrong happened. Please try later"
			resp.Code = 500
			return "", ""
		}

	} else if credentials.Email != "" {
		err := db.QueryRow(models.Select_password_by_email, credentials.Email).Scan(&storedPassword, &user_id, &credentials.Nickname)

		if err == sql.ErrNoRows {
			resp.Error = "invalid credentials"
			resp.Code = http.StatusUnauthorized
			return "", ""

		} else if err != nil {
			fmt.Println("error while getting data by email: ", err)
			resp.Error = "something wrong happened. Please try later"
			resp.Code = 500
			return "", ""
		}

	} else {
		fmt.Println("empty identifiers")
		resp.Error = "please fill all the required field"
		resp.Code = 400
		return "", ""
	}

	return storedPassword, user_id
}

func Login(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	credentials := &models.Credentials{}
	resp := models.Resp{
		Code:    200,
		Message: "you're loged in",
		Error:   "",
	}

	err := helpers.GetData(r, credentials)
	if err != nil {
		resp.Code = 500
		resp.Error = err.Error()
		helpers.Respond(w, &resp)
		return
	}

	storedPassword, user_id := getPassowrdAndID(credentials, &resp, db)
	if storedPassword == "" {
		helpers.Respond(w, &resp)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(credentials.Password))
	if err != nil {
		resp.Error = "invalid credentials"
		resp.Code = http.StatusUnauthorized
		helpers.Respond(w, &resp)
		return
	}

	err = helpers.RemoveCookie(w, r, db, user_id)
	if err != nil {
		resp.Error = err.Error()
		resp.Code = 500
		helpers.Respond(w, &resp)
	}

	err = helpers.CreateNewSession(w, db, user_id)
	if err != nil {
		resp.Code = 500
		resp.Error = err.Error()
		helpers.Respond(w, &resp)
		return
	}

	helpers.Respond(w, &resp)
}
