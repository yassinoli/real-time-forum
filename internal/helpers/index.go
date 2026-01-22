package helpers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"text/template"
)

func RenderMainpage(w http.ResponseWriter) {
	wd, err := os.Getwd()
	if err != nil {
		fmt.Println("error getting working directory: ", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	tmpl, err := template.ParseFiles(filepath.Join(wd, "web", "index.html"))
	if err != nil {
		fmt.Println("error while parsing the template: ", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	err = tmpl.Execute(w, nil)
	if err != nil {
		fmt.Println("error while executing the template: ", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}
