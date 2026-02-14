package services

import (
	"database/sql"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"real-time-forum/backend/models"
	"real-time-forum/backend/repositories/sqlite"
	"real-time-forum/backend/utils"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

func InsertUser(user *models.User, resp *models.Resp, db *sql.DB) uuid.UUID {
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

	user.HashedPw = string(hashedPw)
	user.ID = user_id.String()

	err = sqlite.InsertUser(db, user)
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

func IsValidRegisterCredentials(user *models.User, resp *models.Resp) bool {
	user.FirstName = strings.TrimSpace(user.FirstName)
	user.LastName = strings.TrimSpace(user.LastName)
	user.Nickname = strings.TrimSpace(user.Nickname)
	user.Email = strings.TrimSpace(user.Email)
	user.Password = strings.TrimSpace(user.Password)

	if user.FirstName == "" || user.LastName == "" || user.Nickname == "" ||
		user.Email == "" || user.Password == "" || user.Gender == "" {
		resp.Error = "Please fill all fields"
		return false
	}

	if user.Gender != "male" && user.Gender != "female" {
		resp.Error = "Only male/female are allowed as a gender"
		return false
	}

	if user.Age < 12 {
		resp.Error = "You are too young for this website"
		return false
	}

	if !utils.IsAlphaOnly(user.FirstName) || !utils.IsAlphaOnly(user.LastName) {
		resp.Error = "First name and last name must contain only letters a-z"
		return false
	}

	emailRegex := regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	if !emailRegex.MatchString(user.Email) {
		resp.Error = "Invalid email format"
		return false
	}

	if len(user.Password) < 6 {
		resp.Error = "Password must at least have 6 characters"
		return false
	}

	if len(user.Password) > 20 {
		resp.Error = "Maximum characters for password is 20"
		return false
	}

	return true
}

func IsValidLoginCredentials(credentials *models.Credentials, resp *models.Resp, r *http.Request) bool {
	credentials.Nickname = strings.TrimSpace(credentials.Nickname)
	credentials.Email = strings.TrimSpace(credentials.Email)

	if (credentials.Email == "" && credentials.Nickname == "") || credentials.Password == "" {
		resp.Error = "Please fill all the fields"
		return false
	}

	if len(credentials.Password) < 6 {
		resp.Error = "Minimum characters for password is 6"
		return false
	}

	if len(credentials.Password) > 20 {
		resp.Error = "Maximum characters for password is 20"
		return false
	}

	return true
}
