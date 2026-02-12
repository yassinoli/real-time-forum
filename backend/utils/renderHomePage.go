package utils

import (
	"fmt"
	"html/template"
	"net/http"
)

func RenderMainpage(w http.ResponseWriter) {
	tmpl, err := template.ParseFiles("../frontend/index.html")
	if err != nil {
		fmt.Println("error while parsing the template")
		// render a 500 error
		return
	}

	err = tmpl.Execute(w, nil)
	if err != nil {
		fmt.Println("error while executing the template")
		// render a 500 error
		return
	}
}
