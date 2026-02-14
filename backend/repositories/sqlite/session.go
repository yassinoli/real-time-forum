package sqlite

import (
	"database/sql"
	"fmt"
	"time"
)

func InsertSession(db *sql.DB, session_id, user_id string, expireTime time.Time) error {
	_, err := db.Exec(`INSERT INTO session (id, user_id, expire_at) VALUES (?, ?, ?)`, session_id, user_id, expireTime)
	if err != nil {
		fmt.Println("error inserting session's data:", err)
		return fmt.Errorf("something wrong happened. Please try later")
	}

	return nil
}

func RemoveSession(db *sql.DB, session_id string) error {
	_, err := db.Exec("DELETE FROM session WHERE id = ?", session_id)

	return err
}
