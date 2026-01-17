package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"real-time-forum/internal/helpers"
)

// setCORSHeaders sets CORS headers for API responses
func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// GetPostsHandler returns all posts as JSON
func (app *App) GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	posts, err := helpers.GetAllPosts(app.DB)
	if err != nil {
		fmt.Printf("Error fetching posts: %v\n", err)
		http.Error(w, fmt.Sprintf("Error fetching posts: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// GetPostHandler returns a single post with comments as JSON
func (app *App) GetPostHandler(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	postIDStr := r.URL.Query().Get("id")
	if postIDStr == "" {
		http.Error(w, "Post ID is required", http.StatusBadRequest)
		return
	}

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	post, err := helpers.GetPostByID(app.DB, postID)
	if err != nil {
		fmt.Printf("Error fetching post %d: %v\n", postID, err)
		http.Error(w, fmt.Sprintf("Post not found: %v", err), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// CreatePostHandler handles post creation
func (app *App) CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse form data - handle both multipart/form-data and application/x-www-form-urlencoded
	contentType := r.Header.Get("Content-Type")
	fmt.Printf("Content-Type: %s\n", contentType)

	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(32 << 20); err != nil { // 32MB max
			fmt.Printf("Error parsing multipart form: %v\n", err)
			http.Error(w, "Error parsing form", http.StatusBadRequest)
			return
		}
	} else {
		if err := r.ParseForm(); err != nil {
			fmt.Printf("Error parsing form: %v\n", err)
			http.Error(w, "Error parsing form", http.StatusBadRequest)
			return
		}
	}

	title := strings.TrimSpace(r.FormValue("title"))
	content := strings.TrimSpace(r.FormValue("content"))
	categoriesStr := r.FormValue("categories")

	fmt.Printf("Creating post - Title: '%s', Content length: %d, Categories: '%s'\n", title, len(content), categoriesStr)

	if title == "" {
		http.Error(w, "Title cannot be empty", http.StatusBadRequest)
		return
	}
	if content == "" {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return
	}

	// Get fake session for testing
	session := FakeSession()
	userID := session.UserID

	// Ensure user exists in database
	var err error
	userID, err = helpers.GetOrCreateFakeUser(app.DB, userID, session.Username)
	if err != nil {
		fmt.Printf("Error ensuring user exists: %v\n", err)
		http.Error(w, fmt.Sprintf("Error ensuring user exists: %v", err), http.StatusInternalServerError)
		return
	}

	fmt.Printf("User ID: %d, Username: %s\n", userID, session.Username)

	// Parse categories
	var categoryIDs []int
	if categoriesStr != "" {
		categoryNames := strings.Split(categoriesStr, ",")
		for _, catName := range categoryNames {
			catName = strings.TrimSpace(catName)
			if catName != "" {
				catID, err := helpers.GetCategoryIDByName(app.DB, catName)
				if err != nil {
					fmt.Printf("Error processing category %s: %v\n", catName, err)
					http.Error(w, fmt.Sprintf("Error processing category: %v", err), http.StatusInternalServerError)
					return
				}
				categoryIDs = append(categoryIDs, catID)
			}
		}
	}

	// Create post
	postID, err := helpers.AddPost(app.DB, userID, title, content, categoryIDs)
	if err != nil {
		fmt.Printf("Error creating post: %v\n", err)
		http.Error(w, fmt.Sprintf("Error creating post: %v", err), http.StatusBadRequest)
		return
	}

	fmt.Printf("Post created successfully with ID: %d\n", postID)

	// Return the created post
	post, err := helpers.GetPostByID(app.DB, int(postID))
	if err != nil {
		fmt.Printf("Error fetching created post: %v\n", err)
		http.Error(w, fmt.Sprintf("Error fetching created post: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// AddCommentHandler handles comment creation
func (app *App) AddCommentHandler(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse form data - handle both multipart/form-data and application/x-www-form-urlencoded
	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(32 << 20); err != nil { // 32MB max
			http.Error(w, "Error parsing form", http.StatusBadRequest)
			return
		}
	} else {
		if err := r.ParseForm(); err != nil {
			http.Error(w, "Error parsing form", http.StatusBadRequest)
			return
		}
	}

	postIDStr := r.FormValue("post_id")
	content := strings.TrimSpace(r.FormValue("content"))

	if postIDStr == "" {
		http.Error(w, "Post ID is required", http.StatusBadRequest)
		return
	}

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	// Get fake session for testing
	session := FakeSession()
	userID := session.UserID

	// Ensure user exists in database
	userID, err = helpers.GetOrCreateFakeUser(app.DB, userID, session.Username)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error ensuring user exists: %v", err), http.StatusInternalServerError)
		return
	}

	// Add comment
	err = helpers.AddComment(app.DB, userID, &postID, content)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error adding comment: %v", err), http.StatusBadRequest)
		return
	}

	// Return updated post with comments
	post, err := helpers.GetPostByID(app.DB, postID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error fetching post: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

func (app *App) GetHeader(w http.ResponseWriter, r *http.Request) {
    setCORSHeaders(w)

    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusNoContent)
        return
    }

    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    user := FakeSession()

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]bool{
        "heading": user.LoggedIn,
    })
}
