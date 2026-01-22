export const currentUser = {
    nickName: "",
    socket: null,
}

export class Message {
    constructor(content, type, sender, time) {
        this.content = content;
        this.type = type;
        this.sender = sender;
        this.time = time ? new Date(time) : new Date();
    }

    create() {
        const message = document.createElement("div")
        message.classList.add("fb-message")
        message.classList.add(this.type === "me" ? "fb-message-sent" : "fb-message-received")

        // Format time (Facebook style: just time if today, date + time if older)
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

        // Create message bubble (Facebook style)
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

    // Reset pagination
    currentOffset = 0
    hasMoreMessages = true
    isLoadingMessages = false

    currentUser.socket.send(JSON.stringify({
        sender: currentUser.nickName,
        receiver: user.nickname,
        type: "load_first",
        offset: 0
    }))
}

const closeChat = () => {
    const chatCont = document.querySelector(".chat-container")
    const messages = document.getElementById("messages")

    chatCont.firstElementChild?.remove()

    messages.innerHTML = `
        <img src="statics/assets/sleep.png" alt="sleep-icon" id="sleep-icon">
    `
}

const switchChat = (user) => {
    const chatCont = document.querySelector(".chat-container")
    const receiverEl = document.getElementById("receiver")

    receiverEl.textContent = user.nickname
    updateOnlineMarker(chatCont.firstElementChild, user.online)

    // Reset pagination
    currentOffset = 0
    hasMoreMessages = true
    isLoadingMessages = false

    currentUser.socket.send(JSON.stringify({
        sender: currentUser.nickName,
        receiver: user.nickname,
        type: "load_first",
        offset: 0
    }))
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

let currentOffset = 0
let isLoadingMessages = false
let hasMoreMessages = true

// Throttle function for scroll events
function throttle(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

// Debounce function for scroll events
function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

const addMessage = (msg, history = false) => {
    console.log('addMessage called with:', msg, 'history:', history)
    
    if (!msg || !msg.content) {
        console.error('Invalid message:', msg)
        return
    }

    const type = msg.sender === currentUser.nickName ? "me" : "other"
    console.log('Message type:', type, 'sender:', msg.sender, 'myNickname:', currentUser.nickName)
    
    const message = new Message(msg.content, type, msg.sender, msg.time)
    const messagesContainer = document.getElementById("messages")
    
    if (!messagesContainer) {
        console.error('Messages container not found')
        return
    }

    console.log('Messages container found:', messagesContainer)

    const sentinel = document.getElementById("sentinel")
    const messageElement = message.create()
    
    console.log('Created message element:', messageElement)

    if (history) {
        // Insert before sentinel (for loading older messages)
        if (sentinel) {
            messagesContainer.insertBefore(messageElement, sentinel)
        } else {
            // Create sentinel if it doesn't exist
            const newSentinel = document.createElement("div")
            newSentinel.id = "sentinel"
            messagesContainer.appendChild(newSentinel)
            messagesContainer.insertBefore(messageElement, newSentinel)
        }
    } else {
        // Append new message (for new incoming messages)
        if (sentinel) {
            messagesContainer.insertBefore(messageElement, sentinel)
        } else {
            // Create sentinel if it doesn't exist
            const newSentinel = document.createElement("div")
            newSentinel.id = "sentinel"
            messagesContainer.appendChild(newSentinel)
            messagesContainer.insertBefore(messageElement, newSentinel)
        }
    }
    
    console.log('Message added to DOM, container children count:', messagesContainer.children.length)
}

const loadMoreMessages = () => {
    const receiver = document.getElementById("receiver")?.textContent
    if (!receiver || isLoadingMessages || !hasMoreMessages) return

    isLoadingMessages = true
    // First load is 10, subsequent loads are 20
    if (currentOffset === 0) {
        currentOffset = 10
    } else {
        currentOffset += 20
    }

    currentUser.socket.send(JSON.stringify({
        sender: currentUser.nickName,
        receiver: receiver,
        type: "load_more",
        offset: currentOffset
    }))
}

export const handleChatFront = () => {
    if (currentUser.socket && currentUser.socket.readyState === WebSocket.OPEN) return

    // Close existing connection if any
    if (currentUser.socket) {
        currentUser.socket.close()
    }

    currentUser.socket = new WebSocket("ws://localhost:8080/ws/chat")

    currentUser.socket.onopen = () => {
        console.log('WebSocket connected')
    }

    currentUser.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
    }

    // Setup scroll listener for pagination
    const messagesContainer = document.getElementById("messages")
    if (messagesContainer) {
        const handleScroll = throttle(() => {
            if (messagesContainer.scrollTop <= 100 && hasMoreMessages && !isLoadingMessages) {
                loadMoreMessages()
            }
        }, 200)

        messagesContainer.addEventListener('scroll', handleScroll)
    }

    // Setup Enter key support for textarea
    const chatTextarea = document.getElementById("chat-textarea")
    if (chatTextarea) {
        chatTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
            }
        })
    }

    currentUser.socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data)
            console.log('WebSocket message received:', data.event, data)

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
                    list.append(createUserElement(u))
                })
                currentUser.nickName = data.nickname
                break
            }

            case "chat": {
                console.log('Received chat message event:', data)
                console.log('Message data:', data.message)
                
                if (!data.message || !data.message.sender || !data.message.receiver || !data.message.content) {
                    console.error('Invalid message format:', data.message)
                    break
                }

                const receiver = document.getElementById("receiver")
                const messagesContainer = document.getElementById("messages")

                console.log('Receiver element:', receiver)
                console.log('Messages container:', messagesContainer)

                if (!receiver || !messagesContainer) {
                    // No chat open, show notification
                    console.log('No chat open, showing notification for:', data.message.sender)
                    const senderEl = document.getElementById(data.message.sender)
                    if (senderEl) {
                        const oldNotif = senderEl.querySelector(".msg-notif")
                        const notifNumber = oldNotif ? Number(oldNotif.textContent) : 0
                        senderEl.remove()

                        const newUserEl = createUserElement({ nickname: data.message.sender, online: true }, true, false)
                        const notif = document.createElement("div")
                        notif.classList.add("msg-notif")
                        notif.textContent = notifNumber + 1
                        newUserEl.append(notif)

                        const list = document.querySelector(".user-list-wrapper")
                        if (list) {
                            list.prepend(newUserEl)
                            list.scrollTo({ top: 0, behavior: "smooth" })
                        }
                    }
                    break
                }

                const currentReceiver = receiver.textContent.trim()
                const messageSender = data.message.sender
                const messageReceiver = data.message.receiver
                const myNickname = currentUser.nickName

                console.log('My nickname:', myNickname)
                console.log('Current receiver:', currentReceiver)
                console.log('Message sender:', messageSender)
                console.log('Message receiver:', messageReceiver)

                // Check if this message is for the currently open chat
                // Message is for current chat if:
                // - I sent it: messageSender === myNickname AND messageReceiver === currentReceiver
                // - They sent it: messageSender === currentReceiver AND messageReceiver === myNickname
                const isMyMessage = messageSender === myNickname && messageReceiver === currentReceiver
                const isTheirMessage = messageSender === currentReceiver && messageReceiver === myNickname
                const isCurrentChat = isMyMessage || isTheirMessage

                console.log('Is my message:', isMyMessage)
                console.log('Is their message:', isTheirMessage)
                console.log('Is current chat:', isCurrentChat)

                if (isCurrentChat) {
                    console.log('Message is for current chat, adding to display')
                    
                    // Check if message already exists (avoid duplicates)
                    const existingMessages = messagesContainer.querySelectorAll('.fb-message')
                    let isDuplicate = false
                    
                    for (let msg of existingMessages) {
                        const content = msg.querySelector('.fb-message-content')?.textContent?.trim()
                        if (content === data.message.content.trim()) {
                            // Check time difference (within 5 seconds = duplicate)
                            const msgTime = new Date(data.message.time)
                            const now = new Date()
                            if (Math.abs(now - msgTime) < 5000) {
                                isDuplicate = true
                                console.log('Duplicate message detected, skipping')
                                break
                            }
                        }
                    }

                    if (!isDuplicate) {
                        console.log('Adding message to display')
                        
                        // Remove sleep icon if present
                        const sleepIcon = document.getElementById("sleep-icon")
                        if (sleepIcon) {
                            sleepIcon.remove()
                        }
                        
                        // Ensure sentinel exists
                        let sentinel = document.getElementById("sentinel")
                        if (!sentinel) {
                            sentinel = document.createElement("div")
                            sentinel.id = "sentinel"
                            messagesContainer.appendChild(sentinel)
                        }
                        
                        console.log('Calling addMessage with:', data.message)
                        addMessage(data.message, false)
                        console.log('Message added, scrolling to bottom')
                        
                        // Scroll to bottom to show the new message
                        setTimeout(() => {
                            messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' })
                        }, 50)
                    }
                } else {
                    // Message is for a different chat - show notification
                    console.log('Message is for different chat, showing notification')
                    const senderEl = document.getElementById(messageSender)
                    if (senderEl) {
                        const oldNotif = senderEl.querySelector(".msg-notif")
                        const notifNumber = oldNotif ? Number(oldNotif.textContent) : 0
                        senderEl.remove()

                        const newUserEl = createUserElement({ nickname: messageSender, online: true }, true, false)
                        const notif = document.createElement("div")
                        notif.classList.add("msg-notif")
                        notif.textContent = notifNumber + 1
                        newUserEl.append(notif)

                        const list = document.querySelector(".user-list-wrapper")
                        if (list) {
                            list.prepend(newUserEl)
                            list.scrollTo({ top: 0, behavior: "smooth" })
                        }
                    }
                }

                break
            }

            case "load_message": {
                const cont = document.getElementById("messages")
                if (!cont) break
                
                // Remove sleep icon if present
                const sleepIcon = document.getElementById("sleep-icon")
                if (sleepIcon) {
                    sleepIcon.remove()
                }
                
                // If this is the first load, clear container and add sentinel
                if (currentOffset === 0) {
                    cont.innerHTML = `<div id="sentinel"></div>`
                }

                // Add messages
                const sentinel = document.getElementById("sentinel")
                if (!sentinel) {
                    const newSentinel = document.createElement("div")
                    newSentinel.id = "sentinel"
                    cont.appendChild(newSentinel)
                }
                
                const scrollHeightBefore = cont.scrollHeight
                
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        // Ensure time is properly formatted
                        if (typeof msg.time === 'string') {
                            msg.time = new Date(msg.time)
                        }
                        addMessage(msg, true)
                    })
                } else if (currentOffset === 0) {
                    // No messages on first load - show empty state
                    const emptyMsg = document.createElement("div")
                    emptyMsg.style.textAlign = "center"
                    emptyMsg.style.padding = "2rem"
                    emptyMsg.style.color = "var(--text-secondary)"
                    emptyMsg.textContent = "No messages yet. Start the conversation!"
                    cont.insertBefore(emptyMsg, sentinel)
                }
                
                // Update pagination state - check based on expected limit
                const expectedLimit = currentOffset === 0 ? 10 : 20
                if (!data.messages || data.messages.length < expectedLimit) {
                    hasMoreMessages = false
                }
                
                isLoadingMessages = false

                // Maintain scroll position when loading more
                if (currentOffset > 0) {
                    const scrollHeightAfter = cont.scrollHeight
                    cont.scrollTop = scrollHeightAfter - scrollHeightBefore + cont.scrollTop
                } else {
                    // Scroll to bottom on initial load to show most recent messages
                    setTimeout(() => {
                        cont.scrollTo({ top: cont.scrollHeight, behavior: 'auto' })
                    }, 100)
                }
                break
            }

            case "join": {
                const m = document.createElement("div")
                m.classList.add("online-marker")

                const currentUserEl = document.getElementById(data.newcommers)
                if (!currentUserEl) {
                    const list = document.querySelector(".user-list-wrapper")
                    list.append(createUserElement({ nickname: data.newcommers, online: true }))
                    break
                }

                const oldNotif = currentUserEl.querySelector(".msg-notif")
                const newUser = createUserElement({ nickname: data.newcommers, online: true }, true, false)
                if (oldNotif) newUser.append(oldNotif)
                currentUserEl.parentElement.insertBefore(newUser, currentUserEl)
                currentUserEl.remove()

                const receiver = document.getElementById('receiver')
                if (receiver && receiver.textContent === data.newcommers) {
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
        console.log('WebSocket closed')
        currentUser.socket = null
        // Try to reconnect after 2 seconds
        setTimeout(() => {
            if (!currentUser.socket || currentUser.socket.readyState !== WebSocket.OPEN) {
                handleChatFront()
            }
        }, 2000)
    }
}

export const sendMessage = () => {
    const receiver = document.getElementById("receiver")?.textContent
    const input = document.getElementById("chat-textarea")
    
    if (!receiver) {
        console.error('No receiver selected')
        return
    }
    
    if (!input || !input.value.trim()) {
        console.error('No message content')
        return
    }

    if (!currentUser.socket || currentUser.socket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not connected')
        return
    }

    const messageContent = input.value.trim()
    input.value = ""

    // Send to server - the server will send it back via WebSocket
    const message = {
        type: "chat",
        receiver: receiver,
        content: messageContent
    }
    
    console.log('Sending message:', message)
    
    try {
        currentUser.socket.send(JSON.stringify(message))
    } catch (error) {
        console.error('Error sending message:', error)
        // Restore input value on error
        input.value = messageContent
    }
}