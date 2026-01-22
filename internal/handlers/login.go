package handlers

import (
	"net/http"

	"real-time-forum/internal/helpers"
	"real-time-forum/internal/logic"
	"real-time-forum/internal/models"
)

func (a *App) HandleLogin(w http.ResponseWriter, r *http.Request) {
	switch r.Method {

	case http.MethodGet:
		helpers.RenderMainpage(w)
	case http.MethodPost:
		logic.Login(w, r, a.DB)
	default:
		helpers.Respond(w, &models.Resp{
			Code:  405,
			Error: "method not allowed",
		})
	}
}
