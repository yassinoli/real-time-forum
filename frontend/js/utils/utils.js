// Check if user is logged in and get user info
export async function checkAuth() {
    try {
        const response = await fetch('/api/header-check')
        if (!response.ok) return { loggedIn: false, nickname: '' }
        const data = await response.json()
        return { loggedIn: data.heading === true, nickname: data.nickname || '' }
    } catch (error) {
        return { loggedIn: false, nickname: '' }
    }
}

export const throttle = (cb, delay) => {
    let timer = null

    return (...args) => {
        if (timer) return

        cb(...args)

        timer = setTimeout(() => {
            timer = null
        }, delay)

    }
}

export const debounce = (cb, delay) => {
    let timer = null

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => cb(...args), delay)
    }
}


export const sortUsers = (users) => {
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

export const getNext = (allUsers, userName) => {
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