package handlers

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"

	"real-time-forum/internal/models"
)

func (a *App) HandleRegister(w http.ResponseWriter, r *http.Request) {
	switch r.Method {

	case http.MethodGet:
		tmpl, err := template.ParseFiles("../web/index.html")
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

	case http.MethodPost:

		var user models.User

		err := json.NewDecoder(r.Body).Decode(&user)
		if err != nil {
			fmt.Println("error decoding the body: ", err)
			// render error 500
			return
		}

		resp := models.Resp{
			Message: "you are registered",
			Code:    200,
		}

		w.WriteHeader(200)
		w.Header().Set("content-type", "application/json")
		err = json.NewEncoder(w).Encode(&resp)
		if err != nil {
			fmt.Println("error encoding the body: ", err)
			// render error 500
			return
		}

	default:
		// render error method not allowed
	}
}
