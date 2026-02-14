import { setupEventListeners } from "../components/chat/messageInput.js"
import { addMessage } from "../components/chat/messageWindow.js"
import { createUserNode } from "../components/chat/userList.js"


export const currentUser = {
    nickName: "",
    socket: null,
}

export const messages = {hasmore : true, currentOffset : 0, isLoading : false}

export const handleChatFront = () => {
    if (currentUser.socket) currentUser.socket.close()
 
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

                    data.users.forEach((u) => {
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

                    messages.isLoading = false
                    if (data.messages.length === 0) messages.hasmore = false
                    messages.currentOffset += data.messages.length

                    const newScrollHeight = cont.scrollHeight
                    cont.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)

                    if (cont.scrollHeight <= cont.clientHeight && messages.hasmore) {
                        messages.isLoading = true

                        currentUser.socket.send(JSON.stringify({
                            type: "load_history",
                            receiver: document.getElementById("receiver").textContent,
                            offset: messages.currentOffset
                        }))
                    }
                    break
                }

                case "join": {
                    const currentUserEl = document.getElementById(data.newcommers)

                    if (!currentUserEl) {
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
                }

                case "stop-typing": {
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