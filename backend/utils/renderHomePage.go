package utils

import (
	"fmt"
	"html/template"
	"net/http"

	"real-time-forum/backend/models"
)

func RenderMainpage(w http.ResponseWriter) {
	tmpl, err := template.ParseFiles("../frontend/index.html")
	if err != nil {
		fmt.Println("error while parsing the template")
		Respond(w, &models.Resp{
			Code:  500,
			Error: "Something wrong happened. Please try later",
		})
		return
	}

	err = tmpl.Execute(w, nil)
	if err != nil {
		fmt.Println("error while executing the template")
		Respond(w, &models.Resp{
			Code:  500,
			Error: "Something wrong happened. Please try later",
		})
		return
	}
}
