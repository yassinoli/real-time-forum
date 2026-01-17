package main

import (
	"database/sql"
	"fmt"
	"net/http"

	"real-time-forum/internal/handlers"
	"real-time-forum/internal/models"
	"real-time-forum/internal/websocket"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "./internal/database/real-time-forum.db")
	if err != nil {
		fmt.Println("error creating db file: ", err)
		return
	}

	defer db.Close()

	if err := db.Ping(); err != nil {
		fmt.Println("db ping error:", err)
		return
	}

	_, err = db.Exec(models.Initialize)
	if err != nil {
		fmt.Println("error creating tables: ", err)
		return
	}

	app := &handlers.App{
		DB: db,
	}

	// Serve static files
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.ServeFile(w, r, "./web/index.html")
		} else {
			handlers.ServeStatic(w, r)
		}
	})
	http.HandleFunc("/statics/", handlers.ServeStatic)

	// API routes
	http.HandleFunc("/api/posts", app.GetPostsHandler)
	http.HandleFunc("/api/post", app.GetPostHandler)
	http.HandleFunc("/api/posts/create", app.CreatePostHandler)
	http.HandleFunc("/api/comments/add", app.AddCommentHandler)
	http.HandleFunc("/api/header-check",app.GetHeader)

	// WebSocket
	http.HandleFunc("/ws", websocket.WebsocketHandler)

	fmt.Println("Server started. Go to http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println("error while starting the server")
		return
	}
}
