import { currentUser } from "../../services/websocket.js"
import { throttle, debounce } from "../../utils/utils.js"
import { addMessage, addTyping } from "./messageWindow.js"
import { createUserNode } from "./userList.js"

const sendMessage = () => {
    const receiverEl = document.getElementById("receiver")
    const input = document.getElementById("chat-textarea")

    if (!receiverEl.textContent || !input.value || input.value.length > 2000) return

    currentUser.socket.send(JSON.stringify({
        type: "chat",
        receiver: receiverEl.textContent,
        content: input.value
    }))
}

export const AddToChat = (msg) => {
    const typing = document.querySelector(".typing")

    if (typing) {
        typing.remove()
        addMessage({ sender: msg.sender, receiver: msg.receiver, content: msg.content, time: msg.time })
        addTyping(msg.receiver)
    } else {
        addMessage({ sender: msg.sender, receiver: msg.receiver, content: msg.content, time: msg.time })
    }

    const msgContainer = document.getElementById("messages")
    msgContainer.scrollTo({ top: msgContainer.scrollHeight, behavior: "smooth" })

    document.getElementById(msg.receiver).remove()

    const newEl = createUserNode({ nickname: msg.receiver, online: true }, { hasChat: true })
    document.querySelector(".user-list-wrapper").prepend(newEl)

    document.getElementById("chat-textarea").value = ""
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

const debouncedStopTyping = debounce(sendStopTyping, 5000)

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