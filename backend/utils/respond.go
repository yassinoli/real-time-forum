package utils

import (
	"encoding/json"
	"net/http"

	"real-time-forum/backend/models"
)

func Respond(w http.ResponseWriter, resp *models.Resp) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.Code)

	json.NewEncoder(w).Encode(&resp)
}
