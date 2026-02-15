import { handleRoot } from "./app.js"
import { handleLoginFront, initLogin } from "./components/auth/login.js"
import { handleLogoutFront } from "./components/auth/logout.js"
import { initRegister, handleregisterFront } from "./components/auth/register.js"
import { throttledSendMessage } from "./components/chat/messageInput.js"
import { initPost } from "./components/posts/postPage.js"

export const mainCont = document.getElementById('main-container')
export const navBar = document.getElementById('nav-bar')

const routes = {
    "/": handleRoot,
    "/register": initRegister,
    "/login": initLogin,
    "/posts": initPost,
}

export const renderError = (code, msg) => {
    navBar.innerHTML = ''
    mainCont.innerHTML = `
        <div class="error-container">
            <h1>Error ${code}</h1>
            <p>${msg}</p>
            <a href="/" class="link">Back to home</a>
        </div>
    `
}

export const HandleRouting = async () => {

    const path = window.location.pathname

    const initFunc = routes[path]

    if (!initFunc) {
        renderError(404, "Page not found")
        return
    }

    try {
        const result = initFunc(mainCont, navBar)
        if (result && typeof result.then === 'function') {
            await result
        }

    } catch (error) {
        console.error('Error in route handler:', error)
        renderError(500, "Something wrong happened")
    }
}

window.onpopstate = HandleRouting
HandleRouting()

document.addEventListener("click", (e) => {
    if (e.target.matches('a.link') || e.target.closest('a.link')) {
        e.preventDefault()
        const link = e.target.closest('a.link') || e.target
        window.history.pushState({}, "", link.href)
        HandleRouting()
    }

    if (e.target.id === 'register-submit-btn') {
        e.preventDefault()
        handleregisterFront()
        return
    }

    if (e.target.id === 'login-submit-btn') {
        e.preventDefault()
        handleLoginFront()
        return
    }

    if (e.target.id === 'send-btn') {
        e.preventDefault()
        throttledSendMessage()
        return
    }

    if (e.target.id === 'logout-btn' || e.target.id === 'logout-btn-nav') {
        e.preventDefault()
        handleLogoutFront()
        window.history.pushState({}, "", "/")
        HandleRouting()
        return
    }
})


document.addEventListener('focus', e => {
    console.log(e)
})