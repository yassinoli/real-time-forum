import { currentUser, workerPort } from "../../services/websocket.js"
import { throttle, debounce } from "../../utils/utils.js"
import { addMessage, addTyping } from "./messageWindow.js"

const sendMessage = () => {
    const receiverEl = document.getElementById("receiver")
    const input = document.getElementById("chat-textarea")?.value.trim()

    if (!receiverEl.textContent || !input || input.length > 2000) return

    workerPort.postMessage({
        type: "send",
        payload: {
            type: "chat",
            receiver: receiverEl.textContent,
            content: input
        }
    })
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

    document.getElementById("chat-textarea").value = ""
}

const sendTyping = () => {
    workerPort.postMessage({
        type: "send",
        payload: {
            type: "typing",
            sender: currentUser.nickName,
            receiver: document.getElementById("receiver").textContent,
        }
    })

    currentUser.isTyping = true
}

export const sendStopTyping = () => {
    if (!currentUser.isTyping) return

    workerPort.postMessage({
        type: "send",
        payload: {
            type: "stop-typing",
            sender: currentUser.nickName,
            receiver: document.getElementById("receiver").textContent,
        }
    })

    currentUser.isTyping = false
}

const debouncedStopTyping = debounce(sendStopTyping, 1000)
const throttledSendTyping = throttle(sendTyping, 1000)

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
        throttledSendTyping()
        debouncedStopTyping()
    })


}

export const throttledSendMessage = throttle(sendMessage, 500)