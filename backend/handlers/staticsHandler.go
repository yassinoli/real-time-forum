package handlers

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

func ServeStatic(w http.ResponseWriter, r *http.Request) {
	path := "../frontend" + strings.TrimPrefix(r.URL.Path, "/statics")

	file, err := os.Stat(path)
	if err != nil {
		fmt.Println("error while getting file info: ", err)
		return
	}

	if file.IsDir() {
		http.Error(w, "acess denied", http.StatusUnauthorized)
		return
	}

	http.ServeFile(w, r, path)
}
