package helpers

import (
	"fmt"
	"net/http"
	"text/template"
)

func RenderMainpage(w http.ResponseWriter) {
	tmpl, err := template.ParseFiles("./web/index.html")
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