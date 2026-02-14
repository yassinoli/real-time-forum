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


const createUserElement = (user, receiver = false) => {
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


    return container
}

export const createUserNode = (user, {receiver = false, hasChat = false, pending = null, }) => {
    const el = createUserElement(user, receiver)

    el.dataset.hasChat = hasChat ? "true" : "false"

    if (pending) {
        const notif = document.createElement("div")
        notif.classList.add("msg-notif")
        notif.textContent = pending
        el.append(notif)
    }

    return el
}