package helpers

import (
	"database/sql"
	"fmt"
)

// GetOrCreateFakeUser ensures a user exists in the database for testing
// Returns the user ID, or creates a new user if it doesn't exist
// Since user.id is AUTOINCREMENT, we can't specify the ID, so we'll create users
// and use the returned ID, or find existing users by nickname
func GetOrCreateFakeUser(db *sql.DB, userID int, username string) (int, error) {
	// First, try to get the user by nickname (since we can't control the ID)
	var existingID int
	err := db.QueryRow(`
		SELECT id FROM user WHERE nickname = ?
	`, username).Scan(&existingID)

	if err == nil {
		// User exists, return the ID
		return existingID, nil
	}

	if err != sql.ErrNoRows {
		// Some other error occurred
		return 0, err
	}

	// User doesn't exist, create a fake one
	// Generate fake user data
	firstName := username
	lastName := "TestUser"
	email := fmt.Sprintf("%s%d@test.com", username, userID)
	age := 25
	gender := "Other"
	password := "fake_password_hash"

	result, err := db.Exec(`
		INSERT INTO user (first_name, last_name, nickname, email, age, gender, password)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, firstName, lastName, username, email, age, gender, password)

	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return int(id), nil
}
