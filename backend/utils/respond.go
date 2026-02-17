package utils

import (
	"encoding/json"
	"net/http"

	"real-time-forum/backend/models"
)

var rsps models.Resp

func Respond(w http.ResponseWriter, resp *models.Resp) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.Code)

	err := json.NewEncoder(w).Encode(&resp)
	if err != nil {
		rsps.Code = 500
		rsps.Error = "Something wrong happened. Please try later"
		Respond(w, &rsps)
		return
	}
}
