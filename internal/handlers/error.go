package handlers

import (
	"bytes"
	"fmt"
	"html/template"
	"net/http"
)

func RenderErrorPage(app *App, w http.ResponseWriter, r *http.Request, details error, statusCode int) {
	

	_, err := template.ParseFiles("./template/error.html")
	if err != nil {
		fmt.Printf("\033[41m [INTERNAL SERVER ERROR] 500 \033[0m failed to load error template: %v\n", err)
		http.Error(w, "Error loading error template", http.StatusInternalServerError)
		return
	}

	var buf bytes.Buffer
	
	
	w.WriteHeader(statusCode)
	_, _ = w.Write(buf.Bytes())
}
