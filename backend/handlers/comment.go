package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"
	"strings"
)
			

// AddCommentHandler handles comment creation
func AddCommentHandler(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	var rsps models.Resp
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			rsps.Code = 400
			rsps.Error = "Method not allowed"
			utils.Respond(w,&rsps)
			return
		}

		// read json from front-end

		var reqData struct {
			PostID  string `json:"post_id"`
			Content string `json:"content"`
		}

		if err := json.NewDecoder(r.Body).Decode(&reqData); err != nil {
			rsps.Code = 400
			rsps.Error = "Invalid JSON body"
			utils.Respond(w,&rsps)
			return
		}

		postIDStr := strings.TrimSpace(reqData.PostID)
		content := strings.TrimSpace(reqData.Content)

		if postIDStr == "" {
			rsps.Code = 400
			rsps.Error = "Post ID is required"
			utils.Respond(w,&rsps)
			return
		}

		// Get user from session
		userID, _, err := GetUserFromSession(r, db)
		if err != nil {
			rsps.Code = 401
			rsps.Error = err.Error()
			utils.Respond(w,&rsps)
			return
		}

		// Add comment
		err = AddComment(db, userID, postIDStr, content)
		if err != nil {
			rsps.Code = 400
			rsps.Error = fmt.Sprintf("Error adding comment: %v", err)
			utils.Respond(w,&rsps)
			return
		}

		// Return updated post with comments
		post, err := GetPostByID(db, postIDStr)
		if err != nil {
			rsps.Code = 500
			rsps.Error = fmt.Sprintf("Error fetching post: %v", err)
			utils.Respond(w,&rsps)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(post)
	}
}
