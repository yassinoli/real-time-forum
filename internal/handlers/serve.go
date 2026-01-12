package handlers

import (
	"fmt"
	"net/http"
	"os"
)

func ServeStatic(w http.ResponseWriter, r *http.Request) {
	path := "../web" + r.URL.Path

	file, err := os.Stat(path)
	if err != nil {
		fmt.Println("error while getting file info: ", err)
		return
	}

	if file.IsDir() {
		// rendering a forbidden error
		return
	}

	http.ServeFile(w, r, path)
}
