import { currentUser, messages } from "../../services/websocket.js";
import { createUserNode, updateOnlineMarker } from "./userList.js";

export class Message {
    constructor(content, type, sender, receiver, time) {
        this.content = content;
        this.type = type;
        this.sender = sender
        this.receiver = receiver;
        this.time = new Date(time);
    }

    create() {
        const message = document.createElement("div")
        message.classList.add("fb-message")
        message.classList.add(this.type === "me" ? "fb-message-sent" : "fb-message-received")

        const now = new Date()
        const msgDate = this.time
        const isToday = now.toDateString() === msgDate.toDateString()

        let timeStr
        if (isToday) {
            timeStr = msgDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
        } else {
            timeStr = msgDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
        }

        const bubble = document.createElement("div")
        bubble.classList.add("fb-message-bubble")

        const content = document.createElement("div")
        content.classList.add("fb-message-content")
        content.textContent = this.content

        const timeEl = document.createElement("div")
        timeEl.classList.add("fb-message-time")
        timeEl.textContent = timeStr

        bubble.append(content, timeEl)
        if (this.type !== "me") bubble.prepend(this.sender)
        message.append(bubble)

        return message
    }
}

export const SwapChat = (user) => {
    const receiverEl = document.getElementById("receiver")
    const userEL = document.getElementById(user.nickname)
    if (userEL.children.length === 3) userEL.lastChild.remove()

    if (!receiverEl) {
        openChat(user)
        return
    }

    const currentReceiver = receiverEl.textContent

    if (currentReceiver === user.nickname) {
        closeChat()
        return
    }

    switchChat(user)
}

const openChat = (user) => {
    const chatCont = document.querySelector(".chat-container")

    const header = createUserNode(user, { clickable: false, receiver: true })
    header.removeAttribute("id")

    chatCont.prepend(header)
    chatCont.style.display = "flex"

    messages.currentOffset = 0
    messages.hasmore = true
    messages.isLoading = false
    const cont = document.getElementById("messages")
    cont.innerHTML = `<div id="sentinel"></div>`

    observer.observe(document.getElementById("sentinel"))
}

const switchChat = (user) => {
    const chatCont = document.querySelector(".chat-container")
    const receiverEl = document.getElementById("receiver")

    observer.disconnect()
    messages.currentOffset = 0
    messages.hasmore = true
    messages.isLoading = false
    const cont = document.getElementById("messages")
    cont.innerHTML = `<div id="sentinel"></div>`
    observer.observe(document.getElementById("sentinel"))

    receiverEl.textContent = user.nickname
    updateOnlineMarker(chatCont.firstElementChild, user.online)
}

const closeChat = () => {
    const chatCont = document.querySelector(".chat-container")

    chatCont.firstElementChild?.remove()
    chatCont.querySelector("#messages").innerHTML = ``
    chatCont.style.display = "none"

    observer.disconnect()
}


export const addMessage = (msg, history = false) => {
    const type = msg.sender === currentUser.nickName ? "me" : "other"
    const message = new Message(msg.content, type, msg.sender, msg.receiver, msg.time)
    const messagesContainer = document.getElementById("messages")

    if (history) {
        messagesContainer.insertBefore(message.create(), messagesContainer.children[1])
    } else {
        messagesContainer.append(message.create())
    }
}


const observer = new IntersectionObserver((entries) => {
    const entry = entries[0]

    if (messages.isLoading || !entry.isIntersecting) return

    if (!messages.hasmore) {
        observer.disconnect()
        return
    }

    messages.isLoading = true
    currentUser.socket.send(JSON.stringify({
        sender: currentUser.nickName,
        receiver: document.getElementById('receiver').textContent,
        type: "load_history",
        offset: messages.currentOffset
    }))

})

export const showOldMessage = (oldMessages) => {
    const cont = document.getElementById("messages")
    const notFull = (cont.scrollHeight <= cont.clientHeight) && messages.hasmore
    oldMessages.forEach(msg => addMessage(msg, true))

    const prevHeight = cont.scrollTop

    messages.isLoading = false
    if (oldMessages.length === 0) messages.hasmore = false
    messages.currentOffset += oldMessages.length

    if (notFull) cont.scrollTop = cont.scrollHeight
    else cont.scrollTop = prevHeight

    if (notFull) {
        messages.isLoading = true

        currentUser.socket.send(JSON.stringify({
            type: "load_history",
            receiver: document.getElementById("receiver").textContent,
            offset: messages.currentOffset
        }))
    }
}

export const updateNotification = (list, senderName) => {
    const senderEl = document.getElementById(senderName)
    const oldNotif = senderEl.querySelector(".msg-notif")
    const notifNumber = oldNotif ? Number(oldNotif.textContent) : 0

    senderEl.remove()

    const newUserEl = createUserNode(
        { nickname: senderName, online: true },
        { hasChat: true, pending: notifNumber + 1 }
    )

    list.prepend(newUserEl)
    list.scrollTo({ top: 0, behavior: "smooth" })
}

export const showNewMessage = (message, list) => {
    addMessage(message)

    currentUser.socket.send(JSON.stringify({
        type: "mark_read",
        sender: currentUser.nickName,
        receiver: message.sender
    }))

    document.getElementById(message.sender).remove()
    const newEl = createUserNode({ nickname: message.sender, online: true }, { hasChat: true })
    list.prepend(newEl)

}