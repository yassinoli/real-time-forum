import { currentUser, messages, portKey, workerPort } from "../../services/websocket.js"
import { throttle } from "../../utils/utils.js"
import { sendStopTyping } from "./messageInput.js"
import { createUserNode, updateOnlineMarker } from "./userList.js"

export class Message {
    constructor(content, type, sender, receiver, time) {
        this.content = content
        this.type = type
        this.sender = sender
        this.receiver = receiver
        this.time = new Date(time)
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

const loadMore = throttle(() => {
    workerPort.postMessage({
        type: "send",
        payload: {
            type: "load_history",
            sender: currentUser.nickName,
            receiver: document.getElementById('receiver').textContent,
            offset: messages.currentOffset,
            portKey,
        }
    })

}, 500)

const observer = new IntersectionObserver((entries) => {
    const entry = entries[0]

    if (!entry.isIntersecting) return

    if (!messages.hasmore) {
        observer.disconnect()
        return
    }

    loadMore()
})

const createTypingElement = (typer) => {
    const typing = document.createElement("div")
    const name = document.createElement("span")
    name.textContent = typer

    typing.innerHTML = `
    <div class= "balls-wrapper">
        <div class="ball"></div>
        <div class="ball"></div>
        <div class="ball"></div>
    </div>
    `
    typing.classList.add("typing")
    typing.prepend(name)

    return typing
}

export const addTyping = (typer) => {
    if (document.querySelector(".typing")) return

    const typingEl = createTypingElement(typer)

    const receiver = document.getElementById("receiver")
    if (receiver && receiver.textContent === typer) {
        const msg = document.getElementById("messages")
        msg.append(typingEl)

        msg.scrollTo({ top: msg.scrollHeight, behavior: "smooth" })

    }

}

export const removeTyping = () => {
    document.getElementById("messages").querySelector(".typing")?.remove()
}

const openChat = (user) => {
    const chatCont = document.querySelector(".chat-container")

    const header = createUserNode(user, { clickable: true, receiver: true })
    header.removeAttribute("id")

    chatCont.prepend(header)
    chatCont.style.display = "flex"

    messages.currentOffset = 0
    messages.hasmore = true

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
    const cont = document.getElementById("messages")
    cont.innerHTML = `<div id="sentinel"></div>`
    observer.observe(document.getElementById("sentinel"))

    receiverEl.textContent = user.nickname
    updateOnlineMarker(chatCont.firstElementChild, user.online)

}

const closeChat = () => {
    const chatCont = document.querySelector(".chat-container")

    chatCont.querySelector(".user-data")?.remove()
    chatCont.querySelector("#messages").innerHTML = ``
    chatCont.style.display = "none"

    observer.disconnect()
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
        sendStopTyping()
        closeChat()
        return
    }

    sendStopTyping()
    switchChat(user)
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

export const showOldMessage = (oldMessages) => {
    const cont = document.getElementById("messages")
    const notFull = (cont.scrollHeight <= cont.clientHeight) && messages.hasmore
    oldMessages.forEach(msg => addMessage(msg, true))

    const prevHeight = cont.scrollTop

    if (oldMessages.length === 0) messages.hasmore = false
    messages.currentOffset += oldMessages.length

    if (notFull) cont.scrollTop = cont.scrollHeight
    else cont.scrollTop = prevHeight

    if (notFull) {
        workerPort.postMessage({
            type: "send",
            payload: {
                type: "load_history",
                sender: currentUser.nickName,
                receiver: document.getElementById('receiver').textContent,
                offset: messages.currentOffset,
                portKey,
            }
        })
    }
}

export const showNewMessage = (message, list) => {
    addMessage(message)

    workerPort.postMessage({
        type: "send",
        payload: {
            type: "mark_read",
            sender: currentUser.nickName,
            receiver: message.sender
        }
    })

    document.getElementById(message.sender).remove()
    const newEl = createUserNode({ nickname: message.sender, online: true }, { hasChat: true })
    list.prepend(newEl)

}

export const updateNotification = (list, senderName) => {
    const senderEl = document.getElementById(senderName)
    const oldNotif = senderEl.querySelector(".msg-notif")
    const notifNumber = oldNotif ? Number(oldNotif.textContent) : 0
    console.log(notifNumber)

    senderEl.remove()

    const newUserEl = createUserNode(
        { nickname: senderName, online: true },
        { hasChat: true, pending: notifNumber + 1 }
    )

    list.prepend(newUserEl)
    list.scrollTo({ top: 0, behavior: "smooth" })
}