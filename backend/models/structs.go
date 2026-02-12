package models

import (
	"sync"

	"github.com/gorilla/websocket"
)

type Resp struct {
	Code  int    `json:"code"`
	Error string `json:"error"`
}

type User struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Nickname  string `json:"nickname"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Password  string `json:"password"`
	Email     string `json:"email"`
}

type Credentials struct {
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Client struct {
	ID       string
	NickName string
	Ws       *websocket.Conn
	Mu       *sync.Mutex
}

type Message struct {
	Type     string `json:"type"`
	Sender   string `json:"sender"`
	Receiver string `json:"receiver"`
	Content  string `json:"content"`
	Time     int64  `json:"time"`
	Offset   int    `json:"offset"`
}

type OtherClient struct {
	LastChat        int64  `json:"lastChat"`
	Pending_Message int    `json:"pending"`
	NickName        string `json:"nickname"`
	Online          bool   `json:"online"`
}

type Hub struct {
	Connect    chan Client
	Disconnect chan Client
	Broadcast  chan Message
}