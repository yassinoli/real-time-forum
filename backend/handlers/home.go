package handlers

import (
	"net/http"

	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"
)

func HomeHanlder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.Respond(w, &models.Resp{
			Code:  405,
			Error: "Method not allowed",
		})

		return
	}

	utils.RenderMainpage(w)
}
