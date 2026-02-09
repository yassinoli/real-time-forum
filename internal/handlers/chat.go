package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"real-time-forum/internal/models"

	"github.com/gofrs/uuid"
	"github.com/gorilla/websocket"
)
// Channels used for real-time communication between goroutines
var (
	connect    = make(chan models.Client)
	disconnect = make(chan models.Client)
	broadcast  = make(chan models.Message)
)

// WebsocketHandler handles the WebSocket upgrade and client lifecycle
func (a *App) WebsocketHandler(w http.ResponseWriter, r *http.Request) {
	// Read session cookie
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

	// Configure WebSocket upgrader
	upgrader := websocket.Upgrader{
		// Allow all origins (CORS bypass for WS)
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Upgrade HTTP connection to WebSocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := models.Client{
		ID:       userID,
		NickName: nickname,
		Ws:       ws,
	}

	// Notify server that a client connected
	connect <- client

	// Listen for incoming WebSocket messages
	for {
		_, payload, err := ws.ReadMessage()
		if err != nil {
			disconnect <- client
			ws.Close()
			return
		}

		var msg models.Message
		// Decode JSON message
		if err := json.Unmarshal(payload, &msg); err != nil {
			continue
		}

		// Attach sender nickname to message
		msg.Sender = client.NickName

		// Send message to broadcast channel
		broadcast <- msg
	}
}

// Broadcast manages all connected clients and message routing
func Broadcast(db *sql.DB) {
    // Map of connected users: nickname -> websocket connection	
	clients := make(map[string]*websocket.Conn)

	for {
		select {

		case client := <-connect:
			clients[client.NickName] = client.Ws

			// Load all other users from DB
			rows, err := db.Query(`SELECT nickname, id FROM user WHERE id != ?`, client.ID)
			if err != nil {
				fmt.Println(err)
				continue
			}

			users := []models.OtherClient{}

			// Build user list with metadata
			for rows.Next() {
				var u models.OtherClient
				var id string
				if err := rows.Scan(&u.NickName, &id); err != nil {
					fmt.Println(err)
					continue
				}

				// Get last chat timestamp between users
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

				// Count unread messages
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

				// Check online status
				_, u.Online = clients[u.NickName]
				users = append(users, u)
			}

			rows.Close()

			// Send initial data to new client
			client.Ws.WriteJSON(map[string]any{
				"event":    "init",
				"users":    users,
				"nickname": client.NickName,
			})

			// Notify other clients about new user
			for name, conn := range clients {
				if name == client.NickName {
					continue
				}

				conn.WriteJSON(map[string]any{
					"event":      "join",
					"newcommers": client.NickName,
				})
			}

		case msg := <-broadcast:

			switch msg.Type {
			case "mark_read":
				// mark all messages from this conversation as read (user has chat open)
				_, err := db.Exec(`
				UPDATE private_message
				SET is_read = TRUE
				WHERE sender_id = (SELECT id FROM user WHERE nickname = ?)
				AND receiver_id = (SELECT id FROM user WHERE nickname = ?)
				`, msg.Receiver, msg.Sender)
				if err != nil {
					fmt.Println(err)
				}
				continue

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

				if conn, ok := clients[msg.Sender]; ok {
					conn.WriteJSON(map[string]any{
						"event":    "history",
						"messages": messages,
					})
				}

				continue

			case "chat":
				if receiverConn, ok := clients[msg.Receiver]; ok {
					receiverConn.WriteJSON(map[string]any{
						"event":   "chat",
						"message": msg,
					})
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
					Ws:       clients[msg.Sender],
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

				client.Ws.WriteJSON(map[string]any{
					"event":    "init",
					"users":    users,
					"nickname": client.NickName,
				})
			}

		case client := <-disconnect:
			delete(clients, client.NickName)
			for name, conn := range clients {
				if name == client.NickName {
					continue
				}

				conn.WriteJSON(map[string]any{
					"event": "leave",
					"left":  client.NickName,
				})
			}
		}
	}
}
