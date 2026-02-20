package sqlite

import (
	"database/sql"

	"real-time-forum/backend/models"

	"github.com/gofrs/uuid"
)

func SelectOtherUsers(db *sql.DB, clients map[string]*models.Client, currentUserID string) ([]models.OtherClient, error) {
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

func MarkRead(db *sql.DB, receiver, sender string) error {
	_, err := db.Exec(`
		UPDATE private_message
		SET is_read = TRUE
		WHERE sender_id = (SELECT id FROM user WHERE nickname = ?)
		AND receiver_id = (SELECT id FROM user WHERE nickname = ?)
	`, sender, receiver)
	return err
}

func SelectUnreadCount(db *sql.DB, msg *models.Message) (int, error) {
	var amount int

	err := db.QueryRow(`
		SELECT COUNT(*)
		FROM private_message pm
		JOIN user s ON s.id = pm.sender_id
		JOIN user r ON r.id = pm.receiver_id
		WHERE s.nickname = ?
		AND r.nickname = ?
		AND pm.is_read = FALSE
	`, msg.Receiver, msg.Sender).Scan(&amount)

	return amount, err
}

func SelectOldMessages(db *sql.DB, msg *models.Message) ([]models.Message, error) {
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
		return nil, err
	}

	defer rows.Close()

	messages := []models.Message{}
	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.Time, &m.Content, &m.Sender, &m.Receiver); err != nil {
			continue
		}
		messages = append(messages, m)
	}

	return messages, nil
}

func InsertNewMessage(db *sql.DB, msg *models.Message) error {
	messageID, err := uuid.NewV4()
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO private_message (id, sender_id, receiver_id, content, created_at)
		VALUES (
			?,
			(SELECT id FROM user WHERE nickname = ?),
			(SELECT id FROM user WHERE nickname = ?),
			?,
			?
		)
	`, messageID.String(), msg.Sender, msg.Receiver, msg.Content, msg.Time)

	return err
}
