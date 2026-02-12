package utils

import (
	"encoding/json"
	"fmt"
	"net/http"

	"real-time-forum/backend/models"
)

func Respond(w http.ResponseWriter, resp *models.Resp) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.Code)

	err := json.NewEncoder(w).Encode(&resp)
	if err != nil {
		fmt.Println("error encoding the body: ", err)
		http.Error(w, "Something wrong happened. Please try later", 500)
		return
	}
}
