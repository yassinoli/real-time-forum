package logic

import (
	"database/sql"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"real-time-forum/internal/helpers"
	"real-time-forum/internal/models"

	"golang.org/x/crypto/bcrypt"
)

var loginEmailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func getPassowrdAndID(credentials *models.Credentials, resp *models.Resp, db *sql.DB) (string, string) {
	var storedPassword string
	var user_id string

	credentials.Nickname = strings.TrimSpace(credentials.Nickname)
	credentials.Email = strings.TrimSpace(credentials.Email)

	// Basic backend validation for login data
	if credentials.Password == "" {
		resp.Error = "password is required"
		resp.Code = http.StatusBadRequest
		return "", ""
	}

	if len(credentials.Password) <= 6 {
		resp.Error = "password must be longer than 6 characters"
		resp.Code = http.StatusBadRequest
		return "", ""
	}

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
		// Validate email format if provided
		if !loginEmailRegex.MatchString(credentials.Email) {
			resp.Error = "invalid email format"
			resp.Code = http.StatusBadRequest
			return "", ""
		}

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
