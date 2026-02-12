export const currentUser = {
    nickName: "",
    socket: null,
}

let currentOffset = 0
let isLoading = false
let hasmore = true

let timer
let sent = false


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

        bubble.append(this.type === "me" ? "You:" : this.sender + ":", content, timeEl)
        message.append(bubble)

        return message
    }
}

export const throttle = (cb,) => {
    let timer = null

    return (...args) => {
        if (timer) return

        cb(...args)

        timer = setTimeout(() => {
            timer = null
        }, 500)
    }
}

const createTypingElement = (ele) => {
    if (document.getElementById("typing-animation")) return

    const typing = document.createElement("div")
    typing.id = "typing-animation"
    typing.innerHTML = `
        <div class="tails"></div>
        <div class="balls"></div>
        <div class="balls"></div>
        <div class="balls"></div>
    `
    if (ele.querySelector(".msg-notif")) {
        ele.insertBefore(typing, ele.lastChild)
    } else {
        ele.append(typing)
    }

    animateTyping(typing)
}

const animateTyping = (typing) => {
    const balls = typing.getElementsByClassName("balls")

    let opacity = 0.25
    let increase = true

    typing._interval = setInterval(() => {
        Array.from(balls).forEach((ball, i) => {
            setTimeout(() => {
                ball.style.opacity = opacity
            }, i * 80)
        })

        if (opacity <= 0.25) increase = true
        if (opacity >= 1) increase = false
        opacity += increase ? 0.25 : -0.25
    }, 250)
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

    const header = createUserNode(user, { clickable: false, receiver: true })
    header.removeAttribute("id")

    const closeBtn = document.createElement("button")
    closeBtn.classList.add("close-chat-btn")
    closeBtn.textContent = "X"
    closeBtn.addEventListener("click", closeChat)
    header.append(closeBtn)

    chatCont.prepend(header)
    chatCont.style.display = "flex"

    currentOffset = 0
    hasmore = true
    isLoading = false
    const cont = document.getElementById("messages")
    cont.innerHTML = `<div id="sentinel"></div>`
    observer.observe(document.getElementById("sentinel"))

    document.getElementById("chat-input").addEventListener("input", () => {
        if (!sent) {
            currentUser.socket.send(JSON.stringify({
                sender: currentUser.nickName,
                receiver: document.getElementById('receiver').textContent,
                type: "typing",
            }))

            sent = true
        }

        clearTimeout(timer)

        timer = setTimeout(() => {
            currentUser.socket.send(JSON.stringify({
                sender: currentUser.nickName,
                receiver: document.getElementById('receiver').textContent,
                type: "stop-typing",
            }))

            sent = false
        }, 750)
    })
}

const closeChat = () => {
    if (timer) {
        currentUser.socket.send(JSON.stringify({
            sender: currentUser.nickName,
            receiver: document.getElementById('receiver').textContent,
            type: "stop-typing",
        }))
        clearTimeout(timer)

        timer = undefined
        sent = false
    }

    const chatCont = document.querySelector(".chat-container")

    chatCont.firstElementChild?.remove()
    chatCont.style.display = "none"

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

    document.getElementById("chat-input").addEventListener("input", () => {
        if (!sent) {
            currentUser.socket.send(JSON.stringify({
                sender: currentUser.nickName,
                receiver: document.getElementById('receiver').textContent,
                type: "typing",
            }))

            sent = true
        }

        clearTimeout(timer)

        timer = setTimeout(() => {
            currentUser.socket.send(JSON.stringify({
                sender: currentUser.nickName,
                receiver: document.getElementById('receiver').textContent,
                type: "stop-typing",
            }))

            sent = false
        }, 750)
    })

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

const createUserNode = (
    user,
    {
        clickable = true,
        receiver = false,
        hasChat = false,
        pending = null,
    } = {}
) => {
    const el = createUserElement(user, clickable, receiver)

    el.dataset.hasChat = hasChat ? "true" : "false"

    if (pending) {
        const notif = document.createElement("div")
        notif.classList.add("msg-notif")
        notif.textContent = pending
        el.append(notif)
    }

    return el
}

const addMessage = (msg, history = false) => {
    const type = msg.sender === currentUser.nickName ? "me" : "other"
    const message = new Message(msg.content, type, msg.sender, msg.receiver, msg.time)
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


// Setup event listeners (only once per page)
export const setupEventListeners = () => {
    const chatTextarea = document.getElementById("chat-textarea")
    if (chatTextarea) {
        chatTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                throttledSendMessage()
            }
        })
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

    currentUser.socket.onmessage = async (e) => {
        try {
            const data = await JSON.parse(e.data)

            switch (data.event) {
                case "init": {
                    const list = document.querySelector(".user-list-wrapper")
                    list.innerHTML = ""

                    if (data.users.length === 0) {
                        list.textContent = `You are the only user for now`
                    }

                    data.users.sort((a, b) => {
                        const aHasChat = !!a.lastChat
                        const bHasChat = !!b.lastChat

                        if (aHasChat && !bHasChat) return -1
                        if (!aHasChat && bHasChat) return 1

                        if (aHasChat && bHasChat) {
                            return new Date(b.lastChat) - new Date(a.lastChat)
                        }

                        return String(a.nickname).localeCompare(String(b.nickname))
                    })

                    data.users.forEach((u, i) => {
                        const userEl = createUserNode(u, {
                            hasChat: !!u.lastChat,
                            pending: u.pending
                        })

                        list.append(userEl)
                    })

                    currentUser.nickName = data.nickname
                    break
                }

                case "chat": {
                    const receiver = document.getElementById("receiver")
                    const list = document.querySelector(".user-list-wrapper")


                    if (!receiver || receiver.textContent !== data.message.sender) {
                        const senderEl = document.getElementById(data.message.sender)
                        const oldNotif = senderEl.querySelector(".msg-notif")
                        const notifNumber = oldNotif ? Number(oldNotif.textContent) : 0

                        senderEl.remove()

                        const newUserEl = createUserNode(
                            { nickname: data.message.sender, online: true },
                            { hasChat: true }
                        )

                        const notif = document.createElement("div")
                        notif.classList.add("msg-notif")
                        notif.textContent = notifNumber + 1
                        newUserEl.append(notif)

                        list.prepend(newUserEl)
                        list.scrollTo({ top: 0, behavior: "smooth" })
                        break
                    } else {
                        addMessage(data.message)

                        // mark messages as read so refresh doesn't show wrong notification count
                        currentUser.socket.send(JSON.stringify({
                            type: "mark_read",
                            sender: currentUser.nickName,
                            receiver: data.message.sender
                        }))

                        document.getElementById(data.message.sender).remove()
                        const newEl = createUserNode({ nickname: data.message.sender, online: true }, { hasChat: true })
                        list.prepend(newEl)

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

                    if (cont.scrollHeight <= cont.clientHeight && hasmore) {
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

                    if (!currentUserEl) { // the user is new
                        const list = document.querySelector(".user-list-wrapper")
                        if (list.textContent === `You are the only user for now`) {
                            list.innerHTML = ``
                        }

                        const newUser = createUserNode(
                            { nickname: data.newcommers, online: true },
                            { hasChat: false }
                        )

                        const allUsers = Array.from(list.children)
                        let next = null

                        for (let i = 0; i < allUsers.length; i++) {
                            const curr = allUsers[i]

                            if (curr.dataset.hasChat === "true") continue

                            if (data.newcommers.localeCompare(curr.id) > 0) continue

                            next = curr
                            break
                        }

                        list.insertBefore(newUser, next)
                        break
                    }


                    //saved user is loging 
                    const oldNotif = currentUserEl.querySelector(".msg-notif")
                    const newUser = createUserNode(
                        { nickname: data.newcommers, online: true },
                        { hasChat: currentUserEl.dataset.hasChat === "true" }
                    )
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
                    const newUser = createUserNode(
                        { nickname: data.left, online: false },
                        { hasChat: currentUserEl.dataset.hasChat === "true" }
                    )
                    if (oldNotif) newUser.append(oldNotif)
                    currentUserEl.parentElement.insertBefore(newUser, currentUserEl)
                    currentUserEl.remove()

                    const receiver = document.getElementById('receiver')
                    if (receiver && receiver.textContent === data.left) {
                        receiver.parentElement.querySelector(".online-marker").remove()
                    }

                    break
                }

                case "typing": {
                    const receiver = document.getElementById("receiver")
                    if (receiver && receiver.textContent == data.typer) {
                        createTypingElement(document.getElementById("messages"))
                    } else {
                        createTypingElement(document.getElementById(data.typer))
                    }

                    break
                }

                case "stop-typing": {
                    clearInterval(timer)
                    timer = undefined
                    sent = false
                    const typing = document.getElementById("typing-animation")
                    if (typing) typing.remove()
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

const sendMessage = () => {
    const receiver = document.getElementById("receiver")?.textContent
    const input = document.getElementById("chat-textarea")
    if (!receiver || !input.value) return

    clearInterval(timer)
    timer = undefined
    sent = false
    const typing = document.getElementById("typing-animation")
    if (typing) typing.remove()

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

export const throttledSendMessage = throttle(sendMessage)