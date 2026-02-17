package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"
)

// CreatePostHandler handles post creation
func CreatePostHandler(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	var rsps models.Resp
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			rsps.Code = 400
			rsps.Error = "Method not allowed"
			utils.Respond(w, &rsps)
			return
		}

		var reqData struct {
			Title      string   `json:"title"`
			Content    string   `json:"content"`
			Categories []string `json:"categories"`
		}

		if err := json.NewDecoder(r.Body).Decode(&reqData); err != nil {
			rsps.Code = 400
			rsps.Error = "invalid json body"
			utils.Respond(w, &rsps)
			return
		}

		reqData.Title = strings.TrimSpace(reqData.Title)
		reqData.Content = strings.TrimSpace(reqData.Content)

		if reqData.Title == "" {
			rsps.Code = 400
			rsps.Error = "Title cannot be empty"
			utils.Respond(w, &rsps)
			return
		}
		if reqData.Content == "" {
			rsps.Code = 400
			rsps.Error = "content cannot be empty"
			utils.Respond(w, &rsps)

			return
		}

		var categoryIDs []int
		for _, catName := range reqData.Categories {
			catName = strings.TrimSpace(catName)
			if catName != "" {
				catID, err := GetCategoryIDByName(db, catName)
				if err != nil {
					rsps.Code = 500
					rsps.Error = fmt.Sprintf("Error processing category: %v", err)
					utils.Respond(w, &rsps)
					return
				}
				categoryIDs = append(categoryIDs, catID)
			}
		}

		// Get user from session
		userID, _, err := GetUserFromSession(r, db)
		if err != nil {
			rsps.Code = 401
			rsps.Error = err.Error()
			utils.Respond(w,&rsps)
			return
		}

		// Create post
		postID, err := AddPost(db, userID, reqData.Title, reqData.Content, categoryIDs)
		if err != nil {
			rsps.Code = 400
			rsps.Error = fmt.Sprintf("Error creating post: %v", err)
			utils.Respond(w,&rsps)
			return
		}

		fmt.Printf("Post created successfully with ID: %s\n", postID)

		// Return the created post
		post, err := GetPostByID(db, postID)
		if err != nil {
			rsps.Code = 500
			rsps.Error = fmt.Sprintf("Error fetching post: %v", err)
			utils.Respond(w,&rsps)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(post)
	}
}
