package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true 
	},
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	fmt.Println("Client connected")

	for {
		// read message from client
		msgType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Client disconnected")
			break
		}

		fmt.Println("Received:", string(msg))

		// send message back
		conn.WriteMessage(msgType, msg)
	}
}

func main() {
	http.HandleFunc("/ws", wsHandler)

	// serve frontend
	http.Handle("/", http.FileServer(http.Dir("./public")))

	fmt.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
