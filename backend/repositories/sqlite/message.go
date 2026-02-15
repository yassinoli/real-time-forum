package sqlite

import (
	"database/sql"

	"real-time-forum/backend/models"

	"github.com/gorilla/websocket"
)

func SelectOtherUsers(db *sql.DB, clients map[string]*websocket.Conn, currentUserID string) ([]models.OtherClient, error) {
	rows, err := db.Query(`SELECT nickname, id FROM user WHERE id != ?`, currentUserID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	users := []models.OtherClient{}

	for rows.Next() {
		var u models.OtherClient
		var id string
		if err := rows.Scan(&u.NickName, &id); err != nil {
			return nil, err
		}

		err := db.QueryRow(`
				SELECT created_at
				FROM private_message
				WHERE (sender_id = ? AND receiver_id = ?)
				OR (receiver_id = ? AND sender_id = ?)
				ORDER BY created_at DESC
				LIMIT 1
				`, currentUserID, id, currentUserID, id).Scan(&u.LastChat)
		if err != nil && err != sql.ErrNoRows {
			return nil, err
		}

		err = db.QueryRow(`
    			SELECT COUNT(*)
    			FROM private_message
    			WHERE sender_id = ?
      			AND receiver_id = ?
     			AND is_read = FALSE
				`, id, currentUserID).Scan(&u.Pending_Message)
		if err != nil && err != sql.ErrNoRows {
			return nil, err
		}

		_, u.Online = clients[u.NickName]
		users = append(users, u)
	}

	return users, nil
}
