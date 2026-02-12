package chatwebsocket

import (
	"database/sql"

	"real-time-forum/backend/models"

	"github.com/gorilla/websocket"
)

func Connect(clients map[string]*websocket.Conn, db *sql.DB, client models.Client) error {
	clients[client.NickName] = client.Ws

	rows, err := db.Query(`SELECT nickname, id FROM user WHERE id != ?`, client.ID)
	if err != nil {
		return err
	}

	users := []models.OtherClient{}

	for rows.Next() {
		var u models.OtherClient
		var id string
		if err := rows.Scan(&u.NickName, &id); err != nil {
			return err
		}

		err := db.QueryRow(`
				SELECT created_at
				FROM private_message
				WHERE (sender_id = ? AND receiver_id = ?)
				OR (receiver_id = ? AND sender_id = ?)
				ORDER BY created_at DESC
				LIMIT 1
				`, client.ID, id, client.ID, id).Scan(&u.LastChat)
		if err != nil && err != sql.ErrNoRows {
			return err
		}

		err = db.QueryRow(`
    			SELECT COUNT(*)
    			FROM private_message
    			WHERE sender_id = ?
      			AND receiver_id = ?
     			AND is_read = FALSE
				`, id, client.ID).Scan(&u.Pending_Message)
		if err != nil && err != sql.ErrNoRows {
			return err
		}

		_, u.Online = clients[u.NickName]
		users = append(users, u)
	}

	rows.Close()

	client.Ws.WriteJSON(map[string]any{
		"event":    "init",
		"users":    users,
		"nickname": client.NickName,
	})

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
