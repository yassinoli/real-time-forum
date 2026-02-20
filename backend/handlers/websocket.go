package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"sync"

	"real-time-forum/backend/middleware"
	"real-time-forum/backend/models"

	"github.com/gorilla/websocket"
)

func WebsocketHandler(db *sql.DB, hub *models.Hub) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		var nickname, userID string

		if !middleware.IsloggedIn(w, r, db, &nickname, &userID) {
			return
		}

		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		}

		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		client := &models.Client{
			ID:       userID,
			NickName: nickname,
			Ws:       ws,
			Mu:       &sync.Mutex{},
		}

		hub.Connect <- client

		for {
			_, payload, err := ws.ReadMessage()
			if err != nil {
				client.Ws.Close()
				hub.Disconnect <- client
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
