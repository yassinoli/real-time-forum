package chatwebsocket

import (
	"database/sql"
	"time"

	"real-time-forum/backend/models"

	"github.com/gofrs/uuid"
	"github.com/gorilla/websocket"
)

func MarkRead(db *sql.DB, sender, receiver string) error {
	_, err := db.Exec(`
				UPDATE private_message
				SET is_read = TRUE
				WHERE sender_id = (SELECT id FROM user WHERE nickname = ?)
				AND receiver_id = (SELECT id FROM user WHERE nickname = ?)
				`, receiver, sender)
	if err != nil {
		return nil
	}
	return nil
}

func GetFirstMessages(clients map[string]*websocket.Conn, db *sql.DB, msg models.Message) error {
	_, err := db.Exec(`
				UPDATE private_message
				SET is_read = TRUE 
				WHERE sender_id = (SELECT id FROM user WHERE nickname = ?)
				AND receiver_id = (SELECT id FROM user WHERE nickname = ?)
				`, msg.Receiver, msg.Sender)
	if err != nil {
		return err
	}

	rows, err := db.Query(`
					SELECT pm.created_at, pm.content, us.nickname, ur.nickname
					FROM private_message pm
					JOIN user us ON us.id = pm.sender_id
					JOIN user ur ON ur.id = pm.receiver_id
					WHERE (us.nickname = ? AND ur.nickname = ?)
					OR (us.nickname = ? AND ur.nickname = ?)
					ORDER BY pm.created_at DESC
					LIMIT 10 OFFSET ?
				`, msg.Sender, msg.Receiver, msg.Receiver, msg.Sender, msg.Offset)
	if err != nil {
		return err
	}

	messages := []models.Message{}

	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.Time, &m.Content, &m.Sender, &m.Receiver); err != nil {
			continue
		}
		messages = append(messages, m)
	}
	rows.Close()

	if conn, ok := clients[msg.Sender]; ok {
		conn.WriteJSON(map[string]any{
			"event":    "history",
			"messages": messages,
		})
	}

	return nil
}

func Chat(clients map[string]*websocket.Conn, db *sql.DB, msg models.Message) error {
	if receiverConn, ok := clients[msg.Receiver]; ok {
		receiverConn.WriteJSON(map[string]any{
			"event":   "chat",
			"message": msg,
		})
	}

	messageID, _ := uuid.NewV4()
	now := time.Now().UnixMilli()

	_, err := db.Exec(`
    INSERT INTO private_message (id, sender_id, receiver_id, content, created_at)
    VALUES (
    	?,
    	(SELECT id FROM user WHERE nickname = ?),
    	(SELECT id FROM user WHERE nickname = ?),
    	?,
    	?
    )
	`, messageID.String(), msg.Sender, msg.Receiver, msg.Content, now)
	if err != nil {
		return err
	}

	return nil
}

func GetMoreMessage(clients map[string]*websocket.Conn, db *sql.DB, sender, receiver string) error {
	var user_id string

	err := db.QueryRow(`SELECT id FROM user WHERE nickname = ?`, sender).Scan(&user_id)
	if err != nil {
		return err
	}

	client := models.Client{
		NickName: sender,
		ID:       user_id,
		Ws:       clients[sender],
	}

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

	return nil
}

func Type(clients map[string]*websocket.Conn, receiver, sender string) {
	clients[receiver].WriteJSON(map[string]any{
		"event": "typing",
		"typer": sender,
	})
}

func StopType(clients map[string]*websocket.Conn, receiver, sender string) {
	clients[receiver].WriteJSON(map[string]any{
		"event": "stop-typing",
		"typer": sender,
	})
}