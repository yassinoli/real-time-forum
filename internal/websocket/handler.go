package websocket

import (
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
)

func WebsocketHandler(w http.ResponseWriter, r *http.Request) {
	updrader := websocket.Upgrader{}
	ws, err := updrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("upgrade error:", err)
		return
	}

	defer ws.Close()

	for {
		msgType, msg, err := ws.ReadMessage()
		if err != nil {
			fmt.Println("read error:", err)
			return
		}

		fmt.Println("received:", string(msg))

		if err := ws.WriteMessage(msgType, msg); err != nil {
			fmt.Println("write error:", err)
			return
		}
	}
}
