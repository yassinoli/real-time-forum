package handlers

import (
	"fmt"
	"net/http"
	"os"
)

func ServeStatic(w http.ResponseWriter, r *http.Request) {
	// Use path relative to project root (where main.go is located)
	path := "./web" + r.URL.Path

	file, err := os.Stat(path)
	if err != nil {
		// Don't print error for missing files (like favicon.ico) to reduce noise
		if r.URL.Path != "/favicon.ico" && r.URL.Path != "/.well-known/appspecific/com.chrome.devtools.json" {
			fmt.Println("error while getting file info: ", err)
		}
		return
	}

	if file.IsDir() {
		// rendering a forbidden error
		return
	}

	http.ServeFile(w, r, path)
}
