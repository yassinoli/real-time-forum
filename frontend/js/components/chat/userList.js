import { currentUser } from "../../services/websocket.js"
import { SwapChat } from "./messageWindow.js"

export const updateOnlineMarker = (header, online) => {
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

export const createUserNode = (user, { receiver = false, hasChat = false, pending = null, }) => {
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

    container.addEventListener("click", () => {
        SwapChat({ nickname: user.nickname, online: user.online })
    })

    container.dataset.hasChat = hasChat ? "true" : "false"

    if (pending) {
        const notif = document.createElement("div")
        notif.classList.add("msg-notif")
        notif.textContent = pending
        container.append(notif)
    }

    return container
}

const getNext = (allUsers, userName) => {
    let next = null

    for (let i = 0; i < allUsers.length; i++) {
        const curr = allUsers[i]

        if (curr.dataset.hasChat === "true") continue

        if (userName.localeCompare(curr.id) > 0) continue

        next = curr
        break
    }

    return next
}

export const insertInList = (userName) => {
    const list = document.querySelector(".user-list-wrapper")

    if (list.textContent === `You are the only user for now`) {
        list.innerHTML = ``
    }

    const newUser = createUserNode({ nickname: userName, online: true }, { receiver: false })

    const allUsers = Array.from(list.children)

    list.insertBefore(newUser, getNext(allUsers, userName))
}

export const updateCurrentEl = (newCommersEl, userName) => {
    //taking old notifications
    const oldNotif = newCommersEl.querySelector(".msg-notif")

    //creat new element with current data
    const el = createUserNode(
        { nickname: userName, online: true },
        { hasChat: newCommersEl.dataset.hasChat === "true" }
    )

    if (oldNotif) el.append(oldNotif)
    newCommersEl.parentElement.insertBefore(el, newCommersEl)

    //remove old element
    newCommersEl.remove()

    //If current user was chatting with the connecting user -> update the online marker
    const receiver = document.getElementById('receiver')
    if (receiver && receiver.textContent === userName) {
        updateOnlineMarker(receiver.parentElement, true)
    }

}

const sortUsers = (users) => {
    users.sort((a, b) => {
        const aHasChat = !!a.lastChat
        const bHasChat = !!b.lastChat

        if (aHasChat && !bHasChat) return -1
        if (!aHasChat && bHasChat) return 1

        if (aHasChat && bHasChat) {
            return new Date(b.lastChat) - new Date(a.lastChat)
        }

        return String(a.nickname).localeCompare(String(b.nickname))
    })
}

export const removeMarker = (userName) => {
    const currentUserEl = document.getElementById(userName)
    const oldNotif = currentUserEl.querySelector(".msg-notif")
    const newUser = createUserNode(
        { nickname: userName, online: false },
        { hasChat: currentUserEl.dataset.hasChat === "true" }
    )
    if (oldNotif) newUser.append(oldNotif)
    currentUserEl.parentElement.insertBefore(newUser, currentUserEl)
    currentUserEl.remove()

    const receiver = document.getElementById('receiver')
    if (receiver && receiver.textContent === userName) {
        receiver.parentElement.querySelector(".online-marker").remove()
    }
}

export const initUserList = (data) => {
    const list = document.querySelector(".user-list-wrapper")
    list.innerHTML = ""

    sortUsers(data.users)

    const frag = document.createDocumentFragment()

    data.users.forEach((u) => {
        const userEl = createUserNode(u, {
            hasChat: !!u.lastChat,
            pending: u.pending
        })

        frag.append(userEl)
    })

    list.append(frag)

    currentUser.nickName = data.nickname
}