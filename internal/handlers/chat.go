package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
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

	client := models.Client{
		ID:       userID,
		NickName: nickname,
		Ws:       ws,
	}

	connect <- client

	for {
		_, payload, err := ws.ReadMessage()
		if err != nil {
			disconnect <- client
			ws.Close()
			return
		}

		var msg models.Message
		if err := json.Unmarshal(payload, &msg); err != nil {
			log.Printf("Error unmarshaling message: %v, payload: %s", err, string(payload))
			continue
		}

		msg.Sender = client.NickName
		msg.Time = time.Now()

		broadcast <- msg
	}
}

func Broadcast(db *sql.DB) {
	clients := make(map[string]*websocket.Conn)

	for {
		select {

		case client := <-connect:
			clients[client.NickName] = client.Ws

			rows, err := db.Query(`SELECT nickname, id FROM user WHERE id != ?`, client.ID)
			if err != nil {
				continue
			}

			users := []models.OtherClient{}

			for rows.Next() {
				var u models.OtherClient
				var id string
				if err := rows.Scan(&u.NickName, &id); err != nil {
					continue
				}

				// Get last message time, default to zero time if no messages
				err := db.QueryRow(`
				SELECT created_at
				FROM private_message
				WHERE (sender_id = ? AND receiver_id = ?)
				OR (receiver_id = ? AND sender_id = ?)
				ORDER BY created_at DESC
				LIMIT 1
				`, client.ID, id, client.ID, id).Scan(&u.LastChat)
				if err != nil {
					// No messages yet, LastChat will be zero time
					u.LastChat = time.Time{}
				}

				_, u.Online = clients[u.NickName]
				users = append(users, u)
			}
			rows.Close()
			
			// Sort users: first by last message (most recent first), then alphabetically for users with no messages
			sort.Slice(users, func(i, j int) bool {
				aHasChat := !users[i].LastChat.IsZero()
				bHasChat := !users[j].LastChat.IsZero()
				
				if aHasChat && !bHasChat {
					return true // i has chat, j doesn't - i comes first
				}
				if !aHasChat && bHasChat {
					return false // j has chat, i doesn't - j comes first
				}
				if aHasChat && bHasChat {
					// Both have chats - sort by most recent (descending)
					return users[i].LastChat.After(users[j].LastChat)
				}
				// Neither has chat - sort alphabetically
				return users[i].NickName < users[j].NickName
			})

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

		case msg := <-broadcast:
		

			// Handle message loading requests
			if msg.Type == "load_first" || msg.Type == "load_more" {
				// Get offset from message (0 for initial load, then increments)
				offset := msg.Offset
				if offset < 0 {
					offset = 0
				}

				// Determine limit: 10 for first load, 20 for subsequent loads
				limit := 10
				if offset > 0 {
					limit = 20
				}

				// Get user IDs from nicknames
				var senderID, receiverID string
				err := db.QueryRow(`SELECT id FROM user WHERE nickname = ?`, msg.Sender).Scan(&senderID)
				if err != nil {
					continue
				}
				err = db.QueryRow(`SELECT id FROM user WHERE nickname = ?`, msg.Receiver).Scan(&receiverID)
				if err != nil {
					continue
				}

				rows, err := db.Query(`
					SELECT pm.created_at, pm.content, us.nickname
					FROM private_message pm
					JOIN user us ON us.id = pm.sender_id
					WHERE (pm.sender_id = ? AND pm.receiver_id = ?)
					   OR (pm.sender_id = ? AND pm.receiver_id = ?)
					ORDER BY pm.created_at DESC
					LIMIT ? OFFSET ?
				`, senderID, receiverID, receiverID, senderID, limit, offset)
				if err != nil {
					continue
				}

				messages := []models.Message{}

				for rows.Next() {
					var m models.Message
					if err := rows.Scan(&m.Time, &m.Content, &m.Sender); err != nil {
						continue
					}
					m.Receiver = msg.Receiver
					messages = append(messages, m)
				}
				rows.Close()

				// Reverse messages to show oldest first
				for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
					messages[i], messages[j] = messages[j], messages[i]
				}

				if conn, ok := clients[msg.Sender]; ok {
					conn.WriteJSON(map[string]any{
						"event":    "load_message",
						"messages": messages,
						"offset":   offset,
						"limit":   limit,
					})
				}
				continue
			}

			// Handle regular chat messages
			// Validate message has required fields
			if msg.Sender == "" || msg.Receiver == "" || msg.Content == "" {
				log.Printf("Invalid message: missing fields - Sender: %s, Receiver: %s, Content: %s", 
					msg.Sender, msg.Receiver, msg.Content)
				continue
			}


			// Save message to database first
			messageID, err := uuid.NewV4()
			if err != nil {
				log.Printf("Error generating UUID: %v", err)
				continue
			}
			
			var senderID, receiverID string
			err = db.QueryRow(`SELECT id FROM user WHERE nickname = ?`, msg.Sender).Scan(&senderID)
			if err != nil {
				log.Printf("Error finding sender ID for nickname %s: %v", msg.Sender, err)
				continue
			}
			
			err = db.QueryRow(`SELECT id FROM user WHERE nickname = ?`, msg.Receiver).Scan(&receiverID)
			if err != nil {
				log.Printf("Error finding receiver ID for nickname %s: %v", msg.Receiver, err)
				continue
			}
			
			// Try to get table schema for debugging
			rows, err := db.Query("PRAGMA table_info(private_message)")
			if err == nil {
				log.Printf("Table schema for private_message:")
				for rows.Next() {
					var cid int
					var name, dataType, notNull, defaultValue, pk string
					rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk)
				}
				rows.Close()
			}
			fmt.Println(messageID.String(), senderID, receiverID, msg.Content, msg.Time.Format("2006-01-02 15:04:05"))
			result, err := db.Exec(`
				INSERT INTO private_message (id, sender_id, receiver_id, content , created_at )
				VALUES (?, ?, ?, ?,?)
			`, messageID.String(), senderID, receiverID, msg.Content, msg.Time.Format("2006-01-02 15:04:05"))
			
			if err != nil {
				log.Printf("Error inserting message into database: %v", err)
				continue
			}
			
			rowsAffected, _ := result.RowsAffected()
			log.Printf("Message inserted successfully - Rows affected: %d", rowsAffected)

			// Send to receiver if online
			if receiverConn, ok := clients[msg.Receiver]; ok {
				log.Printf("Sending message to receiver %s (online)", msg.Receiver)
				err := receiverConn.WriteJSON(map[string]any{
					"event":   "chat",
					"message": msg,
				})
				if err != nil {
					log.Printf("Error sending message to receiver: %v", err)
				}
			} else {
				log.Printf("Receiver %s is not online", msg.Receiver)
			}

			// Also send confirmation to sender (so they see it in their chat)
			if senderConn, ok := clients[msg.Sender]; ok {
				log.Printf("Sending message confirmation to sender %s (online)", msg.Sender)
				err := senderConn.WriteJSON(map[string]any{
					"event":   "chat",
					"message": msg,
				})
				if err != nil {
					log.Printf("Error sending message to sender: %v", err)
				}
			} else {
				log.Printf("Sender %s is not online", msg.Sender)
			}

		case client := <-disconnect:
			delete(clients, client.NickName)
			for name, conn := range clients {
				if name == client.NickName {
					continue
				}

				conn.WriteJSON(map[string]any{
					"event" : "leave",
					"left" : client.NickName,
				})
			}
		}
	}
}
