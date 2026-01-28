export const currentUser = {
    nickName: "",
    socket: null,
}

let currentOffset = 0
let isLoading = false
let hasmore = true

// Track unread messages per user
const unreadMessages = new Map()

// Function to update notification badge (will be set by router)
let updateNotificationCallback = null

export const setNotificationCallback = (callback) => {
    updateNotificationCallback = callback
}

// Function to update notification badge
const updateNotificationBadge = () => {
    let totalUnread = 0
    unreadMessages.forEach((count) => {
        totalUnread += count
    })

    if (updateNotificationCallback) {
        updateNotificationCallback(totalUnread)
    }
}

// Function to clear unread count for a user
export const clearUnreadForUser = (nickname) => {
    if (unreadMessages.has(nickname)) {
        unreadMessages.delete(nickname)
        updateNotificationBadge()
    }
}

// Function to add unread message for a user
const addUnreadForUser = (nickname) => {
    const current = unreadMessages.get(nickname) || 0
    unreadMessages.set(nickname, current + 1)
    updateNotificationBadge()
}

export class Message {
    constructor(content, type, receiver, time) {
        this.content = content;
        this.type = type;
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

        bubble.appendChild(content)
        bubble.appendChild(timeEl)
        message.appendChild(bubble)

        return message
    }
}

const SwapChat = (user) => {
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

    const header = createUserElement(user, false, true)
    header.removeAttribute("id")

    chatCont.prepend(header)

    currentOffset = 0
    hasmore = true
    isLoading = false
    const cont = document.getElementById("messages")
    cont.innerHTML = `<div id="sentinel"></div>`
    observer.observe(document.getElementById("sentinel"))
}

const closeChat = () => {
    const chatCont = document.querySelector(".chat-container")
    const messages = document.getElementById("messages")

    chatCont.firstElementChild?.remove()

    messages.innerHTML = `
        <img src="statics/assets/sleep.png" alt="sleep-icon" id="sleep-icon">
    `
    observer.disconnect()
}

const switchChat = (user) => {
    const chatCont = document.querySelector(".chat-container")
    const receiverEl = document.getElementById("receiver")

    observer.disconnect()
    currentOffset = 0
    hasmore = true
    isLoading = false
    const cont = document.getElementById("messages")
    cont.innerHTML = `<div id="sentinel"></div>`
    observer.observe(document.getElementById("sentinel"))

    receiverEl.textContent = user.nickname
    updateOnlineMarker(chatCont.firstElementChild, user.online)

}

const updateOnlineMarker = (header, online) => {
    const avatar = header.querySelector(".avatar")
    if (!avatar) return

    const marker = avatar.querySelector(".online-marker")

    if (online && !marker) {
        const m = document.createElement("div")
        m.classList.add("online-marker")
        avatar.append(m)
    }

    if (!online && marker) {
        marker.remove()
    }
}

const createUserElement = (user, clickable = true, receiver = false) => {
    const container = document.createElement("div")
    container.classList.add("user-data")
    container.id = user.nickname

    const avatar = document.createElement("div")
    avatar.classList.add("avatar")

    const img = document.createElement("img")
    img.src = "statics/assets/user.png"

    const span = document.createElement("span")
    if (receiver) span.id = "receiver"
    span.textContent = user.nickname

    avatar.append(img)

    if (user.online) {
        const marker = document.createElement("div")
        marker.classList.add("online-marker")
        avatar.append(marker)
    }

    container.append(avatar, span)

    if (clickable) {
        container.addEventListener("click", () => {
            SwapChat({ nickname: user.nickname, online: user.online })
        })
    }

    return container
}

const addMessage = (msg, history = false) => {
    const type = msg.sender === currentUser.nickName ? "me" : "other"
    const message = new Message(msg.content, type, msg.receiver, msg.time)
    const messagesContainer = document.getElementById("messages")

    if (history) {
        messagesContainer.insertBefore(message.create(), messagesContainer.children[1])
    } else {
        messagesContainer.append(message.create())
        messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' })
    }
}

const observer = new IntersectionObserver((entries) => {
    const entry = entries[0]

    if (isLoading || !entry.isIntersecting) return

    if (!hasmore) {
        observer.disconnect()
        return
    }

    isLoading = true
    currentUser.socket.send(JSON.stringify({
        sender: currentUser.nickName,
        receiver: document.getElementById('receiver').textContent,
        type: "load_history",
        offset: currentOffset
    }))

})

// Track if event listeners are already set up
let textareaListenerSetup = false
let textareaHandler = null

// Setup event listeners (only once per page)
const setupEventListeners = () => {
    // Setup Enter key support for textarea (only if not already set up)
    const chatTextarea = document.getElementById("chat-textarea")
    if (chatTextarea && !textareaListenerSetup) {
        textareaHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
            }
        }

        chatTextarea.addEventListener('keydown', textareaHandler)
        textareaListenerSetup = true
    }
}

// Reset event listeners when page changes
export const resetEventListeners = () => {
    textareaListenerSetup = false
    const chatTextarea = document.getElementById("chat-textarea")

    if (chatTextarea && textareaHandler) {
        chatTextarea.removeEventListener('keydown', textareaHandler)
        textareaHandler = null
    }
}

export const handleChatFront = () => {
    if (currentUser.socket) return

    currentUser.socket = new WebSocket("ws://localhost:8080/ws/chat")

    currentUser.socket.onopen = () => {
        setupEventListeners()
    }

    currentUser.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
    }

    currentUser.socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data)

            switch (data.event) {
                case "init": {
                    const list = document.querySelector(".user-list-wrapper")
                    list.innerHTML = ""

                    data.users.sort((a, b) => {
                        const aHasChat = a.lastChat !== "0001-01-01T00:00:00Z"
                        const bHasChat = b.lastChat !== "0001-01-01T00:00:00Z"

                        if (aHasChat && !bHasChat) return -1
                        if (!aHasChat && bHasChat) return 1

                        if (aHasChat && bHasChat) {
                            return new Date(b.lastChat) - new Date(a.lastChat)
                        }

                        return String(a.nickname).localeCompare(String(b.nickname))
                    })

                    data.users.forEach(u => {
                        const userEl = createUserElement(u)
                        if (u.pending) {
                            const notif = document.createElement("div")
                            notif.classList.add("msg-notif")
                            notif.textContent = u.pending
                            userEl.append(notif)
                        }

                        const hasChat = u.lastChat !== "0001-01-01T00:00:00Z"
                        userEl.dataset.hasChat = hasChat
                        list.append(userEl)
                    })

                    currentUser.nickName = data.nickname
                    break
                }

                case "chat": {
                    const receiver = document.getElementById("receiver")

                    if (!receiver || receiver.textContent !== data.message.sender) {
                        const senderEl = document.getElementById(data.message.sender)
                        const oldNotif = senderEl.querySelector(".msg-notif")
                        const notifNumber = oldNotif ? Number(oldNotif.textContent) : 0

                        senderEl.remove()

                        const newUserEl = createUserElement({ nickname: data.message.sender, online: true }, true, false)
                        newUserEl.dataset.hasChat = "true"
                        const notif = document.createElement("div")
                        notif.classList.add("msg-notif")
                        notif.textContent = notifNumber + 1
                        newUserEl.append(notif)

                        const list = document.querySelector(".user-list-wrapper")
                        list.prepend(newUserEl)
                        list.scrollTo({ top: 0, behavior: "smooth" })
                        break
                    } else {
                        addMessage(data.message)

                        const senderEl = document.getElementById(data.message.sender)
                        if (senderEl.dataset.hasChat === "false") {
                            senderEl.dataset.hasChat = "true"
                        }
                    }

                    break
                }

                case "history": {
                    const cont = document.getElementById("messages")

                    const prevScrollHeight = cont.scrollHeight
                    const prevScrollTop = cont.scrollTop

                    data.messages.forEach(msg => addMessage(msg, true))

                    isLoading = false
                    if (data.messages.length === 0) hasmore = false
                    currentOffset += data.messages.length

                    const newScrollHeight = cont.scrollHeight
                    cont.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)

                    if (cont.scrollHeight <= cont.clientHeight) {
                        if (!hasmore) return
                        isLoading = true

                        currentUser.socket.send(JSON.stringify({
                            type: "load_history",
                            receiver: document.getElementById("receiver").textContent,
                            offset: currentOffset
                        }))
                    }
                    break
                }

                case "join": {
                    const currentUserEl = document.getElementById(data.newcommers)

                    if (!currentUserEl) {
                        const list = document.querySelector(".user-list-wrapper")
                        const newUser = createUserElement({ nickname: data.newcommers, online: true })
                        newUser.dataset.hasChat = "false"

                        let insertBefore = null
                        const allUsers = Array.from(list.children)

                        for (let i = allUsers.length - 1; i >= 0; i--) {
                            const userEl = allUsers[i]

                            if (userEl.dataset.hasChat === "true") continue

                            const existingNickname = userEl.querySelector("span").textContent

                            if (data.newcommers.localeCompare(existingNickname) < 0) {
                                insertBefore = userEl
                            } else {
                                break
                            }
                        }

                        if (insertBefore) {
                            list.insertBefore(newUser, insertBefore)
                        } else {
                            list.append(newUser)
                        }
                        break
                    }


                    //saved user is loging 
                    const oldNotif = currentUserEl.querySelector(".msg-notif")
                    const newUser = createUserElement({ nickname: data.newcommers, online: true }, true, false)
                    if (oldNotif) newUser.append(oldNotif)
                    currentUserEl.parentElement.insertBefore(newUser, currentUserEl)
                    currentUserEl.remove()

                    const receiver = document.getElementById('receiver')
                    if (receiver && receiver.textContent === data.newcommers) {
                        // current user is reading the loging one's messages
                        const m = document.createElement("div")
                        m.classList.add("online-marker")
                        receiver.parentElement.firstChild.append(m)
                    }

                    break
                }

                case "leave": {
                    const currentUserEl = document.getElementById(data.left)
                    const oldNotif = currentUserEl.querySelector(".msg-notif")
                    const newUser = createUserElement({ nickname: data.left, online: false }, true, false)
                    if (oldNotif) newUser.append(oldNotif)
                    currentUserEl.parentElement.insertBefore(newUser, currentUserEl)
                    currentUserEl.remove()

                    const receiver = document.getElementById('receiver')
                    if (receiver && receiver.textContent === data.left) {
                        receiver.parentElement.querySelector(".online-marker").remove()
                    }

                    break
                }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error, e.data)
        }
    }

    currentUser.socket.onclose = () => {
        currentUser.socket = null
    }
}

export const sendMessage = () => {
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