package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"

	"golang.org/x/crypto/bcrypt"
)

func LoginHanlder(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {

		case http.MethodGet:
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

var loginEmailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func getPassowrdAndID(credentials *models.Credentials, resp *models.Resp, db *sql.DB) (string, string) {
	var storedPassword string
	var user_id string

	credentials.Nickname = strings.TrimSpace(credentials.Nickname)
	credentials.Email = strings.TrimSpace(credentials.Email)

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
		err := db.QueryRow(`SELECT password, id FROM user WHERE nickname = ?`, credentials.Nickname).Scan(&storedPassword, &user_id)

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
		if !loginEmailRegex.MatchString(credentials.Email) {
			resp.Error = "invalid email format"
			resp.Code = http.StatusBadRequest
			return "", ""
		}

		err := db.QueryRow(`SELECT password, id, nickname FROM user WHERE email = ?`, credentials.Email).Scan(&storedPassword, &user_id, &credentials.Nickname)

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
		Code:  200,
		Error: "",
	}

	err := GetData(r, credentials)
	if err != nil {
		resp.Code = 500
		resp.Error = err.Error()
		utils.Respond(w, &resp)
		return
	}

	storedPassword, user_id := getPassowrdAndID(credentials, &resp, db)
	if storedPassword == "" {
		utils.Respond(w, &resp)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(credentials.Password))
	if err != nil {
		resp.Error = "invalid credentials"
		resp.Code = http.StatusUnauthorized
		utils.Respond(w, &resp)
		return
	}

	err = RemoveCookie(w, r, db, user_id)
	if err != nil {
		resp.Error = err.Error()
		resp.Code = 500
		utils.Respond(w, &resp)
	}

	err = CreateNewSession(w, db, user_id)
	if err != nil {
		resp.Code = 500
		resp.Error = err.Error()
		utils.Respond(w, &resp)
		return
	}

	utils.Respond(w, &resp)
}
