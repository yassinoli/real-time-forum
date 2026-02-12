package chatwebsocket

import (
	"database/sql"
	"fmt"

	"real-time-forum/backend/models"

	"github.com/gorilla/websocket"
)

func Broadcast(db *sql.DB, hub *models.Hub) {
	clients := make(map[string]*websocket.Conn)

	for {
		select {

		case client := <-hub.Connect:

			err := Connect(clients, db, client)
			if err != nil {
				fmt.Println(err)
				continue
			}

		case msg := <-hub.Broadcast:

			switch msg.Type {
			case "mark_read":
				err := MarkRead(db, msg.Sender, msg.Receiver)
				if err != nil {
					fmt.Println("failed to send message: ", err)
					continue
				}

			case "load_history":
				err := GetFirstMessages(clients, db, msg)
				if err != nil {
					fmt.Println("failed to send message: ", err)
					continue
				}

			case "chat":
				err := Chat(clients, db, msg)
				if err != nil {
					fmt.Println("failed to send message: ", err)
					continue
				}

			case "reload":
				err := GetMoreMessage(clients, db, msg.Sender, msg.Receiver)
				if err != nil {
					fmt.Println("failed to load more messages: ", err)
					continue
				}

			case "typing":
				Type(clients, msg.Receiver, msg.Sender)

			case "stop-typing":
				StopType(clients, msg.Receiver, msg.Sender)

			}

		case client := <-hub.Disconnect:
			Disconnect(clients, client.NickName)
		}
	}
}
