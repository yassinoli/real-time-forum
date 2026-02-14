package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// CreatePostHandler handles post creation
func CreatePostHandler(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var reqData struct {
			Title      string   `json:"title"`
			Content    string   `json:"content"`
			Categories []string `json:"categories"`
		}

		if err := json.NewDecoder(r.Body).Decode(&reqData); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		reqData.Title = strings.TrimSpace(reqData.Title)
		reqData.Content = strings.TrimSpace(reqData.Content)

		if reqData.Title == "" {
			http.Error(w, "Title cannot be empty", http.StatusBadRequest)
			return
		}
		if reqData.Content == "" {
			http.Error(w, "Content cannot be empty", http.StatusBadRequest)
			return
		}

		var categoryIDs []int
		for _, catName := range reqData.Categories {
			catName = strings.TrimSpace(catName)
			if catName != "" {
				catID, err := GetCategoryIDByName(db, catName)
				if err != nil {
					http.Error(w, fmt.Sprintf("Error processing category: %v", err), http.StatusInternalServerError)
					return
				}
				categoryIDs = append(categoryIDs, catID)
			}
		}

		// Get user from session
		userID, _, err := GetUserFromSession(r, db)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		// Create post
		postID, err := AddPost(db, userID, reqData.Title, reqData.Content, categoryIDs)
		if err != nil {
			fmt.Printf("Error creating post: %v\n", err)
			http.Error(w, fmt.Sprintf("Error creating post: %v", err), http.StatusBadRequest)
			return
		}

		fmt.Printf("Post created successfully with ID: %s\n", postID)

		// Return the created post
		post, err := GetPostByID(db, postID)
		if err != nil {
			fmt.Printf("Error fetching created post: %v\n", err)
			http.Error(w, fmt.Sprintf("Error fetching created post: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(post)
	}
}
