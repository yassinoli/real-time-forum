package handlers

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"real-time-forum/backend/utils"
)

func ServeStatic(w http.ResponseWriter, r *http.Request) {
	path := "../frontend" + strings.TrimPrefix(r.URL.Path, "/statics")

	file, err := os.Stat(path)
	if err != nil {
		fmt.Println("error while getting file info: ", err)
		return
	}

	if file.IsDir() {
		rsps.Code = 401
		rsps.Error = "acess denied"
		utils.Respond(w, &rsps)
		return
	}

	http.ServeFile(w, r, path)
}
