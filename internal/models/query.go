package models

const Initialize = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    nickname TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expire_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comment (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS post_category (
    post_id TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_reaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    is_like BOOLEAN NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    CONSTRAINT unique_post_reaction UNIQUE (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comment_reaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    comment_id TEXT NOT NULL,
    is_like BOOLEAN NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comment(id) ON DELETE CASCADE,
    CONSTRAINT unique_comment_reaction UNIQUE (user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS private_message (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (sender_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES user(id) ON DELETE CASCADE
);

`

// for register
const (
	Insert_user    = `INSERT INTO user (id, first_name, last_name, nickname, email, age, gender, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	Insert_session = `INSERT INTO session (id, user_id, expire_at) VALUES (?, ?, ?)`
)

// for login
const (
	Select_password_by_nickname = `SELECT password, id FROM user WHERE nickname = ?`
	Select_password_by_email    = `SELECT password, id, nickname FROM user WHERE email = ?`
	Delete_session_by_user_id   = `DELETE FROM session WHERE user_id = ?`
	Delete_session_by_id        = `DELETE FROM session WHERE id = ?`
)
