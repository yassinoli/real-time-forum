import { setupEventListeners } from "../components/chat/messageInput.js"
import { addTyping, removeTyping, showNewMessage, showOldMessage, updateNotification } from "../components/chat/messageWindow.js"
import { initUserList, insertInList, removeMarker, updateCurrentEl } from "../components/chat/userList.js"

export const currentUser = {
    nickName: "",
    socket: null,
    isTyping: false,
}

export const messages = {
    hasmore: true,
    currentOffset: 0,
    isLoading: false,
}

export const handleChatFront = () => {
    if (currentUser.socket) {
        currentUser.socket.send(
            JSON.stringify({
                sender: currentUser.nickName,
                type: "reconnect"
            })
        )
    }

    currentUser.socket = new WebSocket("ws://localhost:8080/ws/chat")

    currentUser.socket.onopen = () => {
        setupEventListeners()
    }

    currentUser.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
    }

    currentUser.socket.onmessage = async (e) => {
        try {
            const data = await JSON.parse(e.data)

            switch (data.event) {
                case "init": {

                    if (data.users.length === 0) document.querySelector(".user-list-wrapper")
                        .textContent = `You are the only user for now`
                    else initUserList(data)

                    break
                }

                case "chat": {
                    const receiver = document.getElementById("receiver")
                    const list = document.querySelector(".user-list-wrapper")

                    if (!receiver || receiver.textContent !== data.message.sender) {
                        updateNotification(list, data.message.sender)
                    } else {
                        showNewMessage(data.message, list)
                    }

                    break
                }

                case "history": {
                    showOldMessage(data.messages)
                    break
                }

                case "join": {
                    const newCommersEl = document.getElementById(data.newcommers)

                    if (!newCommersEl) insertInList(data.newcommers)
                    else updateCurrentEl(newCommersEl, data.newcommers)

                    break
                }

                case "leave": {
                    removeMarker(data.left)
                    break
                }

                case "typing": {
                    addTyping(data.typer)
                    break
                }

                case "stop-typing": {
                    removeTyping(data.typer)
                    break
                }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error)
        }
    }

    currentUser.socket.onclose = () => {
        currentUser.socket = null
    }
}