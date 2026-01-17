package handlers

import (
	"math/rand"
	"time"
)

// FakeSessionInfo represents fake session information for testing
type FakeSessionInfo struct {
	UserID   int
	Username string
	LoggedIn bool
}

// FakeSession returns random user information for testing purposes
// This is a temporary function until real authentication is implemented
func FakeSession() FakeSessionInfo {
	// Seed random number generator
	(time.Now().UnixNano())

	// List of fake usernames for testing
	usernames := []string{
		"Alice",
		"Bob",
		"Charlie",
		"Diana",
		"Eve",
		"Frank",
		"Grace",
		"Henry",
		"Iris",
		"Jack",
		"Kate",
		"Liam",
		"Mia",
		"Noah",
		"Olivia",
		"Paul",
		"Quinn",
		"Rachel",
		"Sam",
		"Tina",
	}

	// Generate random user ID between 1 and 20
	userID := rand.Intn(20) + 1

	// Pick a random username
	username := usernames[rand.Intn(len(usernames))]

	return FakeSessionInfo{
		UserID:   userID,
		Username: username,
		LoggedIn: true,
	}
}
