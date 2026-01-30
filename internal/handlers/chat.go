package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"real-time-forum/internal/models"

	"github.com/gofrs/uuid"
	"github.com/gorilla/websocket"
)

var (
	connect    = make(chan models.Client)
	disconnect = make(chan models.Client)
	broadcast  = make(chan models.Message)
)

func (a *App) WebsocketHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var nickname, userID string
	err = a.DB.QueryRow(`
		SELECT u.nickname, u.id
		FROM user u
		JOIN session s ON s.user_id = u.id
		WHERE s.id = ?
	`, cookie.Value).Scan(&nickname, &userID)
	if err != nil {
		http.Error(w, "invalid session", http.StatusUnauthorized)
		return
	}

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	ws.SetReadDeadline(time.Now().Add(60 * time.Second))

	ws.SetPongHandler(func(appData string) error {
		ws.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	client := models.Client{
		ID:       userID,
		NickName: nickname,
		Ws:       ws,
		Mu:       &sync.Mutex{},
	}

	connect <- client

	go func() {
		ticker := time.NewTicker(54 * time.Second)
		defer ticker.Stop()

		for {
			<-ticker.C

			ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
			client.Mu.Lock()
			if err := ws.WriteMessage(websocket.PingMessage, nil); err != nil {
				ws.Close()
				disconnect <- client
				client.Mu.Unlock()
				return
			}
			client.Mu.Unlock()
		}
	}()

	for {
		_, payload, err := ws.ReadMessage()
		if err != nil {
			disconnect <- client
			ws.Close()
			return
		}

		var msg models.Message
		if err := json.Unmarshal(payload, &msg); err != nil {
			continue
		}

		msg.Sender = client.NickName

		broadcast <- msg
	}
}

func Broadcast(db *sql.DB) {
	clients := make(map[string]models.Client)

	for {
		select {

		case client := <-connect:
			clients[client.NickName] = client

			rows, err := db.Query(`SELECT nickname, id FROM user WHERE id != ?`, client.ID)
			if err != nil {
				fmt.Println(err)
				continue
			}

			users := []models.OtherClient{}

			for rows.Next() {
				var u models.OtherClient
				var id string
				if err := rows.Scan(&u.NickName, &id); err != nil {
					fmt.Println(err)
					continue
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
					fmt.Println(err)
					continue
				}

				err = db.QueryRow(`
    			SELECT COUNT(*)
    			FROM private_message
    			WHERE sender_id = ?
      			AND receiver_id = ?
     			AND is_read = FALSE
				`, id, client.ID).Scan(&u.Pending_Message)
				if err != nil && err != sql.ErrNoRows {
					fmt.Println(err)
					continue
				}

				_, u.Online = clients[u.NickName]
				users = append(users, u)
			}

			rows.Close()

			client.Mu.Lock()
			client.Ws.WriteJSON(map[string]any{
				"event":    "init",
				"users":    users,
				"nickname": client.NickName,
			})
			client.Mu.Unlock()

			newClient := client

			for name, c := range clients {
				if name == newClient.NickName {
					continue
				}

				c.Mu.Lock()
				c.Ws.WriteJSON(map[string]any{
					"event":      "join",
					"newcommers": newClient.NickName,
				})
				c.Mu.Unlock()
			}

		case msg := <-broadcast:

			switch msg.Type {
			case "load_history":

				// set the olds messages of the two users as "read"
				_, err := db.Exec(`
				UPDATE private_message
				SET is_read = TRUE 
				WHERE sender_id = (SELECT id FROM user WHERE nickname = ?)
				AND receiver_id = (SELECT id FROM user WHERE nickname = ?)
				`, msg.Receiver, msg.Sender)
				if err != nil {
					fmt.Println(err)
					continue
				}

				// take 10 mesages between two users
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
					fmt.Println(err)
					continue
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

				if client, ok := clients[msg.Sender]; ok {
					client.Mu.Lock()
					client.Ws.WriteJSON(map[string]any{
						"event":    "history",
						"messages": messages,
					})
					client.Mu.Unlock()
				}

				continue

			case "chat":
				if client, ok := clients[msg.Receiver]; ok {
					client.Mu.Lock()
					client.Ws.WriteJSON(map[string]any{
						"event":   "chat",
						"message": msg,
					})
					client.Mu.Unlock()
				}

				messageID, _ := uuid.NewV4()
				now := time.Now().UnixMilli()

				db.Exec(`
				INSERT INTO private_message (id, sender_id, receiver_id, content, created_at)
				VALUES (
					?,
					(SELECT id FROM user WHERE nickname = ?),
					(SELECT id FROM user WHERE nickname = ?),
					?,
					?
				)
			`, messageID.String(), msg.Sender, msg.Receiver, msg.Content, now)

			case "reload":
				var user_id string

				err := db.QueryRow(`SELECT id FROM user WHERE nickname = ?`, msg.Sender).Scan(&user_id)
				if err != nil {
					fmt.Println(err)
					continue
				}

				client := models.Client{
					NickName: msg.Sender,
					ID:       user_id,
					Ws:       clients[msg.Sender].Ws,
					Mu:       clients[msg.Sender].Mu,
				}

				rows, err := db.Query(`SELECT nickname, id FROM user WHERE id != ?`, client.ID)
				if err != nil {
					fmt.Println(err)
					continue
				}

				users := []models.OtherClient{}

				for rows.Next() {
					var u models.OtherClient
					var id string
					if err := rows.Scan(&u.NickName, &id); err != nil {
						fmt.Println(err)
						continue
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
						fmt.Println(err)
						continue
					}

					err = db.QueryRow(`
    			SELECT COUNT(*)
    			FROM private_message
    			WHERE sender_id = ?
      			AND receiver_id = ?
     			AND is_read = FALSE
				`, id, client.ID).Scan(&u.Pending_Message)
					if err != nil && err != sql.ErrNoRows {
						fmt.Println(err)
						continue
					}

					_, u.Online = clients[u.NickName]
					users = append(users, u)
				}

				rows.Close()

				client.Mu.Lock()
				client.Ws.WriteJSON(map[string]any{
					"event":    "init",
					"users":    users,
					"nickname": client.NickName,
				})
				client.Mu.Unlock()
			}

		case leftClient := <-disconnect:
			delete(clients, leftClient.NickName)

			for _, c := range clients {
				c.Mu.Lock()
				c.Ws.WriteJSON(map[string]any{
					"event": "leave",
					"left":  leftClient.NickName,
				})
				c.Mu.Unlock()
			}
		}
	}
}
