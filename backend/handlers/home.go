package handlers

import (
	"net/http"

	"real-time-forum/backend/utils"
)

func HomeHanlder(w http.ResponseWriter, r *http.Request) {
	utils.RenderMainpage(w)
}
