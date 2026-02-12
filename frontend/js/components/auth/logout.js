import { HandleRouting } from "../../router.js"
// import { currentUser } from "./chat.js"

export const handleLogoutFront = async () => {
    try {
        const resp = await fetch("/api/logout", {
            method: "POST",
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        // if (currentUser.socket) {
        //     currentUser.socket.close()
        //     currentUser.socket = null
        // }

        if (!resp.ok) {
            
        }

        window.history.pushState({}, "", "/")
        HandleRouting()

    } catch (err) {
        console.error('Failed to logout:', err)
    }
}