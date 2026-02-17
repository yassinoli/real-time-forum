package chatwebsocket

import (
	"database/sql"

	"real-time-forum/backend/models"
	"real-time-forum/backend/repositories/sqlite"

	"github.com/gorilla/websocket"
)

func Connect(clients map[string]*websocket.Conn, db *sql.DB, client models.Client) error {
	clients[client.NickName] = client.Ws

	users, err := sqlite.SelectOtherUsers(db, clients, client.ID)
	if err != nil {
		return err
	}

	if err := client.Ws.WriteJSON(map[string]any{
		"event":    "init",
		"users":    users,
		"nickname": client.NickName,
	}); err != nil {
		return err
	}

	for name, conn := range clients {
		if name == client.NickName {
			continue
		}

		conn.WriteJSON(map[string]any{
			"event":      "join",
			"newcommers": client.NickName,
		})
	}
	return nil
}

func Reconnect(clients map[string]*websocket.Conn, db *sql.DB, nickname string) error {
	conn, ok := clients[nickname]
	if !ok {
		return nil
	}

	var user_id string
	err := db.QueryRow(`SELECT id FROM user WHERE nickname = ?`, nickname).Scan(&user_id)
	if err != nil {
		return err
	}

	users, err := sqlite.SelectOtherUsers(db, clients, user_id)
	if err != nil {
		return err
	}

	if err := conn.WriteJSON(map[string]any{
		"event":    "init",
		"users":    users,
		"nickname": nickname,
	}); err != nil {
		return err
	}

	return nil
}

func Disconnect(clients map[string]*websocket.Conn, senderName string) {
	delete(clients, senderName)
	for name, conn := range clients {
		if name == senderName {
			continue
		}

		conn.WriteJSON(map[string]any{
			"event": "leave",
			"left":  senderName,
		})
	}
}
