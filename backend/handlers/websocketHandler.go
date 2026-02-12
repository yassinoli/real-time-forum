package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"real-time-forum/backend/middleware"
	"real-time-forum/backend/models"

	"github.com/gorilla/websocket"
)

func WebsocketHandler(db *sql.DB, hub *models.Hub) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{}

		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		var nickname, userID string

		if !middleware.IsloggedIn(w, r, db, &nickname, &userID) {
			return
		}

		client := models.Client{
			ID:       userID,
			NickName: nickname,
			Ws:       ws,
		}

		hub.Connect <- client

		for {
			_, payload, err := ws.ReadMessage()
			if err != nil {
				hub.Disconnect <- client
				ws.Close()
				return
			}

			var msg models.Message
			if err := json.Unmarshal(payload, &msg); err != nil {
				continue
			}

			msg.Sender = client.NickName

			hub.Broadcast <- msg
		}
	}
}
