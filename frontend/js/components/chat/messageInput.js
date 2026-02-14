import { currentUser } from "../../services/websocket.js"
import { throttle } from "../../utils/utils.js"
import { addMessage } from "./messageWindow.js"

const sendMessage = () => {
    const receiver = document.getElementById("receiver")?.textContent
    const input = document.getElementById("chat-textarea")
    if (!receiver || !input.value) return

    addMessage({ sender: currentUser.nickName, receiver, content: input.value, time: Date.now() })

    currentUser.socket.send(JSON.stringify({
        type: "chat",
        receiver,
        content: input.value
    }))

    const receiverEl = document.getElementById(receiver)
    if (receiverEl && receiverEl.dataset.hasChat === "false") {
        receiverEl.dataset.hasChat = "true"
    }

    input.value = ""
}

export const setupEventListeners = () => {
    const chatTextarea = document.getElementById("chat-textarea")
    chatTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            throttledSendMessage()
            console.log("fired")
        }
    })
}

export const throttledSendMessage = throttle(sendMessage)