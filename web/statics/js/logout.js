import { currentUser } from "./chat.js"
import { HandleRouting } from "./router.js"

export const handleLogoutFront = async () => {
    try {
        const resp = await fetch("/api/logout", {
            method: "POST",
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (currentUser.socket) {
            currentUser.socket.close()
            currentUser.socket = null
        }

        if (resp.ok) {
            const data = await resp.json()
            if (data.loggedIn === false) {
                window.history.pushState({}, "", "/")
                HandleRouting()
                return true
            }
        }
        return false
    } catch (err) {
        console.error('Failed to logout:', err)
        return false
    }
}
