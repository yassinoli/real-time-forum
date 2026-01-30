package logic

import (
	"database/sql"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"unicode"

	"real-time-forum/internal/helpers"
	"real-time-forum/internal/models"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

func Register(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	user := &models.User{}
	resp := &models.Resp{
		Code: 200,
	}

	err := helpers.GetData(r, user)
	if err != nil {
		helpers.Respond(w, &models.Resp{Code: 500, Error: err.Error()})
		return
	}

	user_id := insertUser(user, resp, db)
	if user_id == uuid.Nil {
		helpers.Respond(w, resp)
		return
	}

	err = helpers.CreateNewSession(w, db, user_id.String())
	if err != nil {
		helpers.Respond(w, &models.Resp{Code: 500, Error: err.Error()})
		return
	}

	helpers.Respond(w, resp)
}

func isAlphaOnly(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if !unicode.IsLetter(r) {
			return false
		}
	}
	return true
}

var emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func insertUser(user *models.User, resp *models.Resp, db *sql.DB) uuid.UUID {
	// Trim spaces
	user.FirstName = strings.TrimSpace(user.FirstName)
	user.LastName = strings.TrimSpace(user.LastName)
	user.Nickname = strings.TrimSpace(user.Nickname)
	user.Email = strings.TrimSpace(user.Email)

	// Validate required fields
	if user.FirstName == "" || user.LastName == "" || user.Nickname == "" ||
		user.Email == "" || user.Password == "" || user.Gender == "" {
		resp.Code = 400
		resp.Error = "all fields are required"
		return uuid.Nil
	}

	if user.Gender != "male" && user.Gender != "female" {
		resp.Code = 400
		resp.Error = "only male or female are allowed as gender"
		return uuid.Nil
	}

	if user.Age <= 0 {
		resp.Code = 400
		resp.Error = "age must be a valid positive number"
		return uuid.Nil
	}

	// Validate first and last names: only letters a-z / A-Z
	if !isAlphaOnly(user.FirstName) || !isAlphaOnly(user.LastName) {
		resp.Code = 400
		resp.Error = "first name and last name must contain only letters a-z"
		return uuid.Nil
	}

	// Validate email format
	if !emailRegex.MatchString(user.Email) {
		resp.Code = 400
		resp.Error = "invalid email format"
		return uuid.Nil
	}

	// Validate password length (> 6 characters)
	if len(user.Password) <= 6 {
		resp.Code = 400
		resp.Error = "password must at least have 6 characters"
		return uuid.Nil
	}

	hashedPw, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Println("error hashing password: ", err)
		resp.Code = 500
		resp.Error = "something wrong happened. Please try later"
		return uuid.Nil
	}

	user_id, err := uuid.NewV4()
	if err != nil {
		fmt.Println("error creating user id: ", err)
		resp.Code = 500
		resp.Error = "something wrong happened. Please try later"
		return uuid.Nil
	}

	_, err = db.Exec(
		models.Insert_user,
		user_id.String(),
		user.FirstName,
		user.LastName,
		user.Nickname,
		user.Email,
		user.Age,
		user.Gender,
		string(hashedPw),
	)
	if err != nil {
		msg := err.Error()

		switch {
		case strings.Contains(msg, "user.email"):
			resp.Error = "invalid or already used credentials"
			resp.Code = http.StatusConflict
			return uuid.Nil

		case strings.Contains(msg, "user.nickname"):
			resp.Error = "invalid or already used credentials"
			resp.Code = http.StatusConflict
			return uuid.Nil

		default:
			fmt.Println("error inserting user's data:", err)
			resp.Code = 500
			resp.Error = "something wrong happened. Please try later"
			return uuid.Nil
		}
	}

	return user_id
}
