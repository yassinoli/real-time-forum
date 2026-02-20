package chatwebsocket

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"real-time-forum/backend/models"
	"real-time-forum/backend/repositories/sqlite"
)

func GetUnread(clients map[string]*models.Client, db *sql.DB, msg models.Message) error {
	client, ok := clients[msg.Sender]
	if !ok {
		return nil
	}

	var amount int
	amount, err := sqlite.SelectUnreadCount(db, &msg)
	if err != nil {
		return err
	}

	client.Mu.Lock()
	err = client.Ws.WriteJSON(map[string]any{
		"event":    "unread",
		"receiver": msg.Receiver,
		"amount":   amount,
		"portKey":  msg.PortKey,
	})
	client.Mu.Unlock()

	return err
}

func GetOldMessages(clients map[string]*models.Client, db *sql.DB, msg models.Message) error {
	client, ok := clients[msg.Sender]
	if !ok {
		return nil
	}

	err := sqlite.MarkRead(db, msg.Sender, msg.Receiver)
	if err != nil {
		return err
	}

	client.Mu.Lock()
	err = client.Ws.WriteJSON(map[string]any{
		"event":  "read",
		"target": msg.Receiver,
	})
	client.Mu.Unlock()
	if err != nil {
		return err
	}

	messages, err := sqlite.SelectOldMessages(db, &msg)
	if err != nil {
		return err
	}

	client.Mu.Lock()
	err = client.Ws.WriteJSON(map[string]any{
		"event":    "history",
		"messages": messages,
		"portKey":  msg.PortKey,
	})
	client.Mu.Unlock()

	return err
}

func Chat(clients map[string]*models.Client, db *sql.DB, msg models.Message) error {
	if len(strings.TrimSpace(msg.Content)) == 0 {
		return errors.New("message is empty")
	}

	if len(msg.Content) > 2000 {
		return errors.New("message is too long")
	}

	now := time.Now().UnixMilli()
	msg.Time = now

	err := sqlite.InsertNewMessage(db, &msg)
	if err != nil {
		return err
	}

	if receiverConn, ok := clients[msg.Receiver]; ok {
		receiverConn.Mu.Lock()
		receiverConn.Ws.WriteJSON(map[string]any{
			"event":   "chat",
			"message": msg,
			"time":    now,
		})
		receiverConn.Mu.Unlock()
	}

	if senderConn, ok := clients[msg.Sender]; ok {
		senderConn.Mu.Lock()
		senderConn.Ws.WriteJSON(map[string]any{
			"event":   "own-message",
			"message": msg,
			"time":    now,
		})
		senderConn.Mu.Unlock()
	}

	return nil
}

func Type(clients map[string]*models.Client, receiver, sender string) {
	client, ok := clients[receiver]
	if !ok {
		return
	}
	client.Mu.Lock()
	client.Ws.WriteJSON(map[string]any{
		"event": "typing",
		"typer": sender,
	})
	client.Mu.Unlock()
}

func StopType(clients map[string]*models.Client, receiver, sender string) {
	client, ok := clients[receiver]
	if !ok {
		return
	}
	client.Mu.Lock()
	client.Ws.WriteJSON(map[string]any{
		"event": "stop-typing",
		"typer": sender,
	})
	client.Mu.Unlock()
}
