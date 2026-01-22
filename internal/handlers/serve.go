package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

func ServeStatic(w http.ResponseWriter, r *http.Request) {
	// Get the current working directory
	wd, err := os.Getwd()
	if err != nil {
		fmt.Println("error getting working directory: ", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Build the file path
	path := filepath.Join(wd, "web", r.URL.Path)

	file, err := os.Stat(path)
	if err != nil {
		fmt.Println("error while getting file info: ", err)
		http.Error(w, "File Not Found", http.StatusNotFound)
		return
	}

	if file.IsDir() {
		// rendering a forbidden error
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	http.ServeFile(w, r, path)
}
