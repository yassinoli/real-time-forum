import { currentUser } from "../../services/websocket.js"
import { throttle } from "../../utils/utils.js"
import { addMessage } from "./messageWindow.js"
import { createUserNode } from "./userList.js"

const sendMessage = () => {
    const receiverEl = document.getElementById("receiver")
    const input = document.getElementById("chat-textarea")

    if (!receiverEl.textContent || !input.value) return

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

export const setupEventListeners = () => {
    const chatTextarea = document.getElementById("chat-textarea")
    chatTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            throttledSendMessage()
        }
    })
}

export const throttledSendMessage = throttle(sendMessage, 500)