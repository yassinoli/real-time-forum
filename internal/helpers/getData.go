package helpers

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func GetData(r *http.Request, data any) error {
    defer r.Body.Close()

    if err := json.NewDecoder(r.Body).Decode(data); err != nil {
        return fmt.Errorf("invalid request body")
    }
    return nil
}
