package chatwebsocket

import (
	"database/sql"
	"errors"
	"time"

	"real-time-forum/backend/models"

	"github.com/gofrs/uuid"
	"github.com/gorilla/websocket"
)

func MarkRead(db *sql.DB, receiver, sender string) error {
	_, err := db.Exec(`
				UPDATE private_message
				SET is_read = TRUE
				WHERE sender_id = (SELECT id FROM user WHERE nickname = ?)
				AND receiver_id = (SELECT id FROM user WHERE nickname = ?)
				`, sender, receiver)
	if err != nil {
		return err
	}

	return nil
}

func GetUnread(clients map[string]*websocket.Conn, db *sql.DB, msg models.Message) error {
	var amount int

	err := db.QueryRow(`
				SELECT COUNT(*)
				FROM private_message pm
				JOIN user s ON s.id = pm.sender_id
				JOIN user r ON r.id = pm.receiver_id
				WHERE s.nickname = ?
				AND r.nickname = ?
				AND pm.is_read = FALSE`, msg.Receiver, msg.Sender).Scan(&amount)
	if err != nil {
		return err
	}

	clients[msg.Sender].WriteJSON(map[string]any{
		"event":    "unread",
		"receiver": msg.Receiver,
		"amount":   amount,
		"portKey":  msg.PortKey,
	})

	return nil
}

func GetOldMessages(clients map[string]*websocket.Conn, db *sql.DB, msg models.Message) error {
	err := MarkRead(db, msg.Sender, msg.Receiver)
	if err != nil {
		return err
	}

	clients[msg.Sender].WriteJSON(map[string]any{
		"event":  "read",
		"target": msg.Receiver,
	})

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
		if err := conn.WriteJSON(map[string]any{
			"event":    "history",
			"messages": messages,
			"portKey":  msg.PortKey,
		}); err != nil {
			return err
		}
	}

	return nil
}

func Chat(clients map[string]*websocket.Conn, db *sql.DB, msg models.Message) error {
	if len(msg.Content) > 2000 {
		return errors.New("message is too long")
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

	msg.Time = now

	if receiverConn, ok := clients[msg.Receiver]; ok {
		receiverConn.WriteJSON(map[string]any{
			"event":   "chat",
			"message": msg,
			"time":    now,
		})
	}

	if senderConn, ok := clients[msg.Sender]; ok {
		senderConn.WriteJSON(map[string]any{
			"event":   "own-message",
			"message": msg,
			"time":    now,
		})
	}

	return nil
}

func Type(clients map[string]*websocket.Conn, receiver, sender string) {
	if conn, ok := clients[receiver]; ok {
		conn.WriteJSON(map[string]any{
			"event": "typing",
			"typer": sender,
		})
	}
}

func StopType(clients map[string]*websocket.Conn, receiver, sender string) {
	if conn, ok := clients[receiver]; ok {
		conn.WriteJSON(map[string]any{
			"event": "stop-typing",
			"typer": sender,
		})
	}
}
