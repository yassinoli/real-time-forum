package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// AddCommentHandler handles comment creation
func AddCommentHandler(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// read json from front-end

		var reqData struct {
			PostID  string `json:"post_id"`
			Content string `json:"content"`
		}

		if err := json.NewDecoder(r.Body).Decode(&reqData); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		postIDStr := strings.TrimSpace(reqData.PostID)
		content := strings.TrimSpace(reqData.Content)

		if postIDStr == "" {
			http.Error(w, "Post ID is required", http.StatusBadRequest)
			return
		}

		// Get user from session
		userID, _, err := GetUserFromSession(r, db)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		// Add comment
		err = AddComment(db, userID, postIDStr, content)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error adding comment: %v", err), http.StatusBadRequest)
			return
		}

		// Return updated post with comments
		post, err := GetPostByID(db, postIDStr)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error fetching post: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(post)
	}
}
