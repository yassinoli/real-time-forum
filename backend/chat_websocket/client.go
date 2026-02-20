package chatwebsocket

import (
	"database/sql"

	"real-time-forum/backend/models"
	"real-time-forum/backend/repositories/sqlite"
)

func Connect(clients map[string]*models.Client, db *sql.DB, client *models.Client) error {
	clients[client.NickName] = client

	users, err := sqlite.SelectOtherUsers(db, clients, client.ID)
	if err != nil {
		return err
	}

	stored := clients[client.NickName]
	stored.Mu.Lock()
	err = stored.Ws.WriteJSON(map[string]any{
		"event":    "init",
		"users":    users,
		"nickname": stored.NickName,
	})
	stored.Mu.Unlock()
	if err != nil {
		return err
	}

	for name, c := range clients {
		if name == client.NickName {
			continue
		}

		c.Mu.Lock()
		c.Ws.WriteJSON(map[string]any{
			"event":    "join",
			"newcomer": client.NickName,
		})
		c.Mu.Unlock()
	}
	return nil
}

func Reconnect(clients map[string]*models.Client, db *sql.DB, nickname string) error {
	client, ok := clients[nickname]
	if !ok {
		return nil
	}

	var userID string
	userID, err := sqlite.GetUserID(db, nickname)
	if err != nil {
		return err
	}

	users, err := sqlite.SelectOtherUsers(db, clients, userID)
	if err != nil {
		return err
	}

	client.Mu.Lock()
	err = client.Ws.WriteJSON(map[string]any{
		"event":    "init",
		"users":    users,
		"nickname": nickname,
	})
	client.Mu.Unlock()

	return err
}

func Disconnect(clients map[string]*models.Client, senderName string) {
	delete(clients, senderName)
	for name, c := range clients {
		if name == senderName {
			continue
		}

		c.Mu.Lock()
		c.Ws.WriteJSON(map[string]any{
			"event": "leave",
			"left":  senderName,
		})
		c.Mu.Unlock()
	}
}
