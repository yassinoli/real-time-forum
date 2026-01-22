package handlers

import (
	"net/http"

	"real-time-forum/internal/helpers"
	"real-time-forum/internal/models"
)

func (a *App) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.Respond(w, &models.Resp{
			Code:  405,
			Error: "method not allowed",
		})

		return
	}

	helpers.RemoveCookie(w, r, a.DB, "")
}
