package helpers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"real-time-forum/internal/models"
)

func Respond(w http.ResponseWriter, resp *models.Resp) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.Code)

	err := json.NewEncoder(w).Encode(&resp)
	if err != nil {
		fmt.Println("error encoding the body: ", err)
		// render error 500
		return
	}
}
