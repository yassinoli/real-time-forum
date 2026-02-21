package chatwebsocket

import (
	"database/sql"

	"real-time-forum/backend/models"
	"real-time-forum/backend/repositories/sqlite"
)

func Connect(clients map[string][]*models.Client, db *sql.DB, client *models.Client) error {
	users, err := sqlite.SelectOtherUsers(db, clients, client.ID)
	if err != nil {
		return err
	}

	client.Mu.Lock()
	err = client.Ws.WriteJSON(map[string]any{
		"event":    "init",
		"users":    users,
		"nickname": client.NickName,
	})
	client.Mu.Unlock()
	if err != nil {
		return err
	}

	for name, cs := range clients {
		if name == client.NickName {
			continue
		}

		for _, c := range cs {
			c.Mu.Lock()
			c.Ws.WriteJSON(map[string]any{
				"event":    "join",
				"newcomer": client.NickName,
			})
			c.Mu.Unlock()
		}
	}
	return nil
}

func Reconnect(clients map[string][]*models.Client, db *sql.DB, nickname string) error {
	cs, ok := clients[nickname]
	if !ok || len(cs) == 0 {
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

	for _, client := range cs {
		client.Mu.Lock()
		err = client.Ws.WriteJSON(map[string]any{
			"event":    "init",
			"users":    users,
			"nickname": nickname,
		})
		client.Mu.Unlock()
		if err != nil {
			return err
		}
	}

	return nil
}

func Disconnect(clients map[string][]*models.Client, client *models.Client) {
	nickname := client.NickName
	cs, ok := clients[nickname]
	if !ok {
		return
	}

	// Remove specific connection
	for i, c := range cs {
		if c == client {
			clients[nickname] = append(cs[:i], cs[i+1:]...)
			break
		}
	}

	// If no connections left for this user, broadcast "leave"
	if len(clients[nickname]) == 0 {
		delete(clients, nickname)
		for name, cs := range clients {
			if name == nickname {
				continue
			}

			for _, c := range cs {
				c.Mu.Lock()
				c.Ws.WriteJSON(map[string]any{
					"event": "leave",
					"left":  nickname,
				})
				c.Mu.Unlock()
			}
		}
	}
}
