package chatwebsocket

import (
	"database/sql"
	"fmt"

	"real-time-forum/backend/models"

	"github.com/gorilla/websocket"
)

// RunBroker is the central message broker for the chat system.
// It runs in a single goroutine and processes connect/disconnect/broadcast events sequentially.
func RunBroker(db *sql.DB, hub *models.Hub) {
	clients := make(map[string]*websocket.Conn)

	for {
		select {

		case client := <-hub.Connect:

			// If user already has an old connection, close it gracefully
			if oldConn, exists := clients[client.NickName]; exists {
				oldConn.Close()
			}

			err := Connect(clients, db, client)
			if err != nil {
				fmt.Println("broker: connect error:", err)
				// Remove the broken connection
				delete(clients, client.NickName)
				continue
			}

		case msg := <-hub.Broadcast:

			switch msg.Type {
			case "reconnect":
				err := Reconnect(clients, db, msg.Sender)
				if err != nil {
					fmt.Printf("broker: failed to reconnect user: %v because of: %v\n", msg.Sender, err)
					continue
				}

			case "mark_read":
				err := MarkRead(db, msg.Sender, msg.Receiver)
				if err != nil {
					fmt.Println("broker: failed to mark read:", err)
					continue
				}

			case "load_history":
				err := GetFirstMessages(clients, db, msg)
				if err != nil {
					fmt.Println("broker: failed to load history:", err)
					continue
				}

			case "chat":
				err := Chat(clients, db, msg)
				if err != nil {
					fmt.Println("broker: failed to send chat:", err)
					if conn, ok := clients[msg.Sender]; ok {
						conn.WriteJSON(map[string]any{
							"event": "error",
							"error": "Failed to send message. Please try again.",
						})
					}
					continue
				}

			case "reload":
				err := GetMoreMessage(clients, db, msg.Sender, msg.Receiver)
				if err != nil {
					fmt.Println("broker: failed to load more messages:", err)
					continue
				}

			case "typing":
				Type(clients, msg.Receiver, msg.Sender)

			case "stop-typing":
				StopType(clients, msg.Receiver, msg.Sender)

			}

		case client := <-hub.Disconnect:
			// Only remove if this is the SAME connection (not a newer reconnection)
			if current, ok := clients[client.NickName]; ok && current == client.Ws {
				Disconnect(clients, client.NickName)
			}
		}
	}
}
