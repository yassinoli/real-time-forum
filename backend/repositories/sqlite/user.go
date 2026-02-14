package sqlite

import (
	"database/sql"
	"fmt"
	"net/http"

	"real-time-forum/backend/models"
)

func InsertUser(db *sql.DB, user *models.User) error {
	_, err := db.Exec(
		`INSERT INTO user (id, first_name, last_name, nickname, email, age, gender, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID,
		user.FirstName,
		user.LastName,
		user.Nickname,
		user.Email,
		user.Age,
		user.Gender,
		user.HashedPw,
	)

	return err
}

func SelectPasswordAndID(db *sql.DB, resp *models.Resp, credentials *models.Credentials) (string, string) {
	var storedPassword string
	var user_id string

	target := "email"
	value := credentials.Email
	if credentials.Nickname != "" {
		target = "nickname"
		value = credentials.Nickname
	}

	err := db.QueryRow("SELECT password, id FROM user WHERE "+target+" = ?", value).Scan(&storedPassword, &user_id)

	if err == sql.ErrNoRows {
		resp.Error = "Invalid credentials"
		resp.Code = http.StatusUnauthorized
		return "", ""

	} else if err != nil {
		fmt.Println("error while getting stored registration data: ", err)
		resp.Error = "Something wrong happened. Please try again"
		resp.Code = 500
		return "", ""
	}

	return storedPassword, user_id
}