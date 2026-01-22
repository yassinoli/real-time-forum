export const currentUser = {
    nickName: "",
    socket: null,
}

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
    
    // Clear notification badge when opening chat
    if (userEL) {
        const notif = userEL.querySelector(".msg-notif")
        if (notif) {
            notif.remove()
        }
        if (userEL.children.length === 3) userEL.lastChild.remove()
    }
    
    // Clear unread count for this user
    clearUnreadForUser(user.nickname)

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

    // Clear unread count for this user
    clearUnreadForUser(user.nickname)

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

    // Clear unread count for this user
    clearUnreadForUser(user.nickname)

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

// Track if event listeners are already set up
let scrollListenerSetup = false
let textareaListenerSetup = false
let scrollHandler = null
let textareaHandler = null

// Setup event listeners (only once per page)
const setupEventListeners = () => {
    // Setup scroll listener for pagination (only if not already set up)
    const messagesContainer = document.getElementById("messages")
    if (messagesContainer && !scrollListenerSetup) {
        scrollHandler = throttle(() => {
            if (messagesContainer.scrollTop <= 100 && hasMoreMessages && !isLoadingMessages) {
                loadMoreMessages()
            }
        }, 200)

        messagesContainer.addEventListener('scroll', scrollHandler)
        scrollListenerSetup = true
    }

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

// Helper function to populate user list
const populateUserList = (list, users, nickname) => {
    console.log('Populating user list with', users.length, 'users')
    list.innerHTML = ""

    users.sort((a, b) => {
        const aHasChat = a.lastChat !== "0001-01-01T00:00:00Z"
        const bHasChat = b.lastChat !== "0001-01-01T00:00:00Z"

        if (aHasChat && !bHasChat) return -1
        if (!aHasChat && bHasChat) return 1

        if (aHasChat && bHasChat) {
            return new Date(b.lastChat) - new Date(a.lastChat)
        }

        return String(a.nickname).localeCompare(String(b.nickname))
    })

    users.forEach(u => {
        const userEl = createUserElement(u)
        list.append(userEl)
    })
    
    currentUser.nickName = nickname
    console.log('User list populated successfully, current user:', currentUser.nickName)
}

// Reset event listeners when page changes
export const resetEventListeners = () => {
    scrollListenerSetup = false
    textareaListenerSetup = false
    const messagesContainer = document.getElementById("messages")
    const chatTextarea = document.getElementById("chat-textarea")
    if (messagesContainer && scrollHandler) {
        messagesContainer.removeEventListener('scroll', scrollHandler)
        scrollHandler = null
    }
    if (chatTextarea && textareaHandler) {
        chatTextarea.removeEventListener('keydown', textareaHandler)
        textareaHandler = null
    }
}

export const handleChatFront = (forceReconnect = false) => {
    // If force reconnect is true, close existing connection
    if (forceReconnect && currentUser.socket) {
        currentUser.socket.onclose = null
        currentUser.socket.onmessage = null
        currentUser.socket.onerror = null
        currentUser.socket.close()
        currentUser.socket = null
    }
    
    // Only create new connection if we don't have one or it's closed
    if (currentUser.socket && currentUser.socket.readyState === WebSocket.OPEN) {
        // Connection is already open, check if we need to populate user list
        const list = document.querySelector(".user-list-wrapper")
        if (list && list.children.length === 0) {
            // User list is empty, we need to reconnect to get init data
            console.log('User list is empty, forcing reconnection')
            currentUser.socket.close()
            currentUser.socket = null
        } else {
            // Just ensure event listeners are set up
            setupEventListeners()
            return
        }
    }

    // Close existing connection if any
    if (currentUser.socket) {
        currentUser.socket.onclose = null // Remove old handlers
        currentUser.socket.onmessage = null
        currentUser.socket.onerror = null
        currentUser.socket.close()
        currentUser.socket = null
    }

    console.log('Creating new WebSocket connection')
    currentUser.socket = new WebSocket("ws://localhost:8080/ws/chat")

    currentUser.socket.onopen = () => {
        console.log('WebSocket connected')
        setupEventListeners()
    }

    currentUser.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
    }

    currentUser.socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data)
            console.log('WebSocket message received:', data.event, data)

            switch (data.event) {
            case "init": {
                // Wait a bit to ensure DOM is ready
                setTimeout(() => {
                    const list = document.querySelector(".user-list-wrapper")
                    if (!list) {
                        console.error('User list wrapper not found, retrying...')
                        // Retry after a short delay
                        setTimeout(() => {
                            const retryList = document.querySelector(".user-list-wrapper")
                            if (retryList && data.users) {
                                populateUserList(retryList, data.users, data.nickname)
                            }
                        }, 100)
                        return
                    }
                    
                    populateUserList(list, data.users, data.nickname)
                }, 50)
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
                const myNickname = currentUser.nickName

                console.log('Receiver element:', receiver)
                console.log('Messages container:', messagesContainer)

                if (!receiver || !messagesContainer) {
                    // No chat open, show notification
                    console.log('No chat open, showing notification for:', data.message.sender)
                    
                    // Add to unread count for header notification (only if message is for me)
                    if (data.message.sender !== myNickname && data.message.receiver === myNickname) {
                        addUnreadForUser(data.message.sender)
                    }
                    
                    // Update user list with notification badge
                    const list = document.querySelector(".user-list-wrapper")
                    if (list) {
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

                            list.prepend(newUserEl)
                            list.scrollTo({ top: 0, behavior: "smooth" })
                        } else {
                            // User not in list, add them
                            const newUserEl = createUserElement({ nickname: data.message.sender, online: true }, true, false)
                            const notif = document.createElement("div")
                            notif.classList.add("msg-notif")
                            notif.textContent = "1"
                            newUserEl.append(notif)
                            list.prepend(newUserEl)
                            list.scrollTo({ top: 0, behavior: "smooth" })
                        }
                    }
                    break
                }

                const currentReceiver = receiver.textContent.trim()
                const messageSender = data.message.sender
                const messageReceiver = data.message.receiver

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
                    
                    // Check if this is a message we already showed optimistically
                    const tempMessages = messagesContainer.querySelectorAll('[data-temp-id]')
                    let foundTempMessage = false
                    
                    for (let tempMsg of tempMessages) {
                        const tempContent = tempMsg.querySelector('.fb-message-content')?.textContent?.trim()
                        if (tempContent === data.message.content.trim()) {
                            // This is our optimistic message, replace it with the real one
                            tempMsg.remove()
                            foundTempMessage = true
                            console.log('Replacing optimistic message with real message')
                            break
                        }
                    }
                    
                    // Check if message already exists (avoid duplicates) - only if not replacing temp message
                    if (!foundTempMessage) {
                        const existingMessages = messagesContainer.querySelectorAll('.fb-message')
                        let isDuplicate = false
                        
                        for (let msg of existingMessages) {
                            const content = msg.querySelector('.fb-message-content')?.textContent?.trim()
                            if (content === data.message.content.trim()) {
                                // Check time difference - if very recent (within 2 seconds), it's likely a duplicate
                                const msgTime = new Date(data.message.time)
                                const now = new Date()
                                if (Math.abs(now - msgTime) < 2000) {
                                    isDuplicate = true
                                    console.log('Duplicate message detected, skipping')
                                    break
                                }
                            }
                        }
                        
                        if (isDuplicate) {
                            break
                        }
                    }
                    
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
                    
                    // Scroll to bottom to show the new message (use requestAnimationFrame for better timing)
                    requestAnimationFrame(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight
                        // Also try smooth scroll as fallback
                        setTimeout(() => {
                            messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' })
                        }, 10)
                    })
                } else {
                    // Message is for a different chat - show notification
                    console.log('Message is for different chat, showing notification')
                    
                    // Add to unread count for header notification (only if message is for me)
                    if (messageSender !== myNickname && messageReceiver === myNickname) {
                        addUnreadForUser(messageSender)
                    }
                    
                    // Update user list with notification badge
                    const list = document.querySelector(".user-list-wrapper")
                    if (list) {
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

                            list.prepend(newUserEl)
                            list.scrollTo({ top: 0, behavior: "smooth" })
                        } else {
                            // User not in list, add them
                            const newUserEl = createUserElement({ nickname: messageSender, online: true }, true, false)
                            const notif = document.createElement("div")
                            notif.classList.add("msg-notif")
                            notif.textContent = "1"
                            newUserEl.append(notif)
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
        // Try to reconnect after 2 seconds (only if we're on a page that needs chat)
        const messagesContainer = document.getElementById("messages")
        if (messagesContainer) {
            setTimeout(() => {
                if (!currentUser.socket || (currentUser.socket && currentUser.socket.readyState !== WebSocket.OPEN)) {
                    handleChatFront()
                }
            }, 2000)
        }
    }
}

export const sendMessage = () => {
    const receiver = document.getElementById("receiver")?.textContent
    const input = document.getElementById("chat-textarea")
    const messagesContainer = document.getElementById("messages")
    
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
        // Try to reconnect
        handleChatFront()
        // Wait a bit and try again
        setTimeout(() => {
            if (currentUser.socket && currentUser.socket.readyState === WebSocket.OPEN) {
                sendMessage()
            } else {
                alert('Connection lost. Please refresh the page.')
            }
        }, 1000)
        return
    }

    const messageContent = input.value.trim()
    const tempMessageId = 'temp-' + Date.now() + '-' + Math.random()
    
    // Create optimistic message (show immediately)
    const optimisticMessage = {
        sender: currentUser.nickName,
        receiver: receiver,
        content: messageContent,
        time: new Date(),
        tempId: tempMessageId
    }
    
    // Show message immediately (optimistic UI)
    if (messagesContainer) {
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
        
        // Add message with temp ID
        const messageEl = new Message(messageContent, "me", currentUser.nickName, new Date()).create()
        messageEl.setAttribute('data-temp-id', tempMessageId)
        messagesContainer.insertBefore(messageEl, sentinel)
        
        // Scroll to bottom immediately
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight
            setTimeout(() => {
                messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' })
            }, 10)
        })
    }
    
    // Clear input
    input.value = ""

    // Send to server - the server will send it back via WebSocket
    const message = {
        type: "chat",
        sender: currentUser.nickName,
        receiver: receiver,
        content: messageContent
    }
    
    console.log('Sending message:', message)
    
    try {
        currentUser.socket.send(JSON.stringify(message))
        console.log('Message sent successfully')
    } catch (error) {
        console.error('Error sending message:', error)
        // Remove optimistic message on error
        const tempMsg = messagesContainer?.querySelector(`[data-temp-id="${tempMessageId}"]`)
        if (tempMsg) {
            tempMsg.remove()
        }
        // Restore input value on error
        input.value = messageContent
        alert('Failed to send message. Please try again.')
    }
}