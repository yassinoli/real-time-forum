import { HandleRouting, renderError } from "../../router.js"
import { request } from "../../services/api.js"
import { currentUser } from "../../services/websocket.js"

export const handleLogoutFront = async () => {
    const result = await request("/api/logout", {
        method: "POST",
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })

    if (!result.success) {
        renderError(result.code, result.error)
        return
    }

    if (currentUser.socket) {
        currentUser.socket.close()
        currentUser.socket = null
    }

    window.history.pushState({}, "", "/")
    HandleRouting()
}