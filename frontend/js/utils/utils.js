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