import { currentUser } from "../../services/websocket.js"
import { throttle, debounce } from "../../utils/utils.js"
import { addMessage } from "./messageWindow.js"
import { createUserNode } from "./userList.js"

const sendMessage = () => {
    const receiverEl = document.getElementById("receiver")
    const input = document.getElementById("chat-textarea")

    if (!receiverEl.textContent || !input.value) return

    console.log("hello",Date.now())
    addMessage({ sender: currentUser.nickName, receiver: receiverEl.textContent, content: input.value, time: Date.now() })

    const msgContainer = document.getElementById("messages")
    msgContainer.scrollTo({ top: msgContainer.scrollHeight, behavior: "smooth" })

    document.getElementById(receiverEl.textContent).remove()
    const newEl = createUserNode({ nickname: receiverEl.textContent, online: true }, { hasChat: true })
    document.querySelector(".user-list-wrapper").prepend(newEl)

    currentUser.socket.send(JSON.stringify({
        type: "chat",
        receiver: receiverEl.textContent,
        content: input.value
    }))

    if (receiverEl && receiverEl.dataset.hasChat === "false") {
        receiverEl.dataset.hasChat = "true"
    }

    input.value = ""
}

const sendTyping = () => {
    if (currentUser.isTyping) return

    currentUser.socket.send(JSON.stringify({
        sender: currentUser.nickName,
        receiver: document.getElementById("receiver").textContent,
        type: "typing",
    }))

    currentUser.isTyping = true
}

const sendStopTyping = () => {
    if (!currentUser.isTyping) return

    currentUser.socket.send(JSON.stringify({
        sender: currentUser.nickName,
        receiver: document.getElementById("receiver").textContent,
        type: "stop-typing",
    }))

    currentUser.isTyping = false
}

const debouncedStopTyping = debounce(sendStopTyping, 750)

export const setupEventListeners = () => {
    const chatTextarea = document.getElementById("chat-textarea")
    chatTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            throttledSendMessage()
            sendStopTyping()
        }
    })

    chatTextarea.addEventListener("input", () => {
        sendTyping()
        debouncedStopTyping()
    })

}

export const throttledSendMessage = throttle(sendMessage, 500)