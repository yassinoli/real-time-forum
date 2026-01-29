import { homeTemplate, registerTemplate, loginTemplate, postsTemplate } from './templates.js'
import { currentUser, handleChatFront, setupEventListeners, throttledSendMessage } from './chat.js'
import { handleLoginFront } from './login.js'
import { handleregisterFront } from './register.js'
import { handleLogoutFront } from './logout.js'
import { loadPosts, initializePage } from './home.js'
import { creatPost } from './createPost.js'

const mainCont = document.getElementById('main-container')
const navBar = document.getElementById('nav-bar')

// Check if user is logged in and get user info
async function checkAuth() {
    try {
        const response = await fetch('/api/header-check')
        if (!response.ok) return { loggedIn: false, nickname: '' }
        const data = await response.json()
        return { loggedIn: data.heading === true, nickname: data.nickname || '' }
    } catch (error) {
        return { loggedIn: false, nickname: '' }
    }
}

// Function to create header with message icon
const createHeader = (auth, showCreatePost = true) => {
    return `
        <header class="forum-header">
            <h1 class="forum-title">
                <a href="/posts" class="link">Forum</a>
            </h1>
            <div class="forum-header-actions">
                ${showCreatePost ? '<button id="create-post-btn" class="create-post-btn">Create Post</button>' : ''}
                <div class="user-profile-container">
                    <div class="user-profile-avatar" id="user-profile-avatar">
                        <img src="./statics/assets/user.png" alt="User">
                    </div>
                    <div class="user-profile-menu" id="user-profile-menu">
                        <div class="user-profile-name">${auth.nickname}</div>
                        <button id="logout-btn-nav" class="logout-menu-btn">Logout</button>
                    </div>
                </div>
            </div>
        </header>
    `
}

const initHome = async () => {
    const auth = await checkAuth()
    navBar.innerHTML = ''

    if (auth.loggedIn) {
        // Redirect to posts if logged in
        window.history.pushState({}, "", "/posts")
        initPosts()
    } else {
        mainCont.innerHTML = homeTemplate()
    }
}

const initRegister = () => {
    navBar.innerHTML = ''
    mainCont.innerHTML = registerTemplate()
}

const initLogin = () => {
    navBar.innerHTML = ''
    mainCont.innerHTML = loginTemplate()
}

const initPosts = async () => {
    // Check authentication first
    const auth = await checkAuth()
    if (!auth.loggedIn) {
        window.history.pushState({}, "", "/")
        initHome()
        return
    }

    // Create header with Forum title, message icon, user profile, and create post button
    navBar.innerHTML = createHeader(auth)
    mainCont.innerHTML = postsTemplate()

    // Initialize posts
    setTimeout(() => {
        initializePage()
        loadPosts()
        if (currentUser.socket) {
            currentUser.socket.send(JSON.stringify({
                type: "reload",
            }))

            setupEventListeners()

        } else {
            handleChatFront()
        }

        // Setup create post button
        const createPostBtn = document.getElementById('create-post-btn')
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => {
                const main = document.querySelector('main')
                if (main) main.style.visibility = 'hidden'
                creatPost()
            })
        }

        // Setup user profile hover
        const userProfile = document.getElementById('user-profile-avatar')
        const userMenu = document.getElementById('user-profile-menu')
        if (userProfile && userMenu) {
            userProfile.addEventListener('mouseenter', () => {
                userMenu.style.display = 'block'
            })
            userProfile.addEventListener('mouseleave', () => {
                // Delay to allow clicking logout
                setTimeout(() => {
                    if (!userMenu.matches(':hover')) {
                        userMenu.style.display = 'none'
                    }
                }, 200)
            })
            userMenu.addEventListener('mouseenter', () => {
                userMenu.style.display = 'block'
            })
            userMenu.addEventListener('mouseleave', () => {
                userMenu.style.display = 'none'
            })
        }

        // Setup logout button
        const logoutBtn = document.getElementById('logout-btn-nav')
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await handleLogoutFront()
                window.history.pushState({}, "", "/")
                HandleRouting()
            })
        }

    }, 100)
}


const routes = {
    "/": initHome,
    "/register": initRegister,
    "/login": initLogin,
    "/posts": initPosts,
    "/logout": async () => {
        await handleLogoutFront()
        window.history.pushState({}, "", "/")
        HandleRouting()
    },
}

const render404 = () => {
    navBar.innerHTML = ''
    mainCont.innerHTML = `
        <div class="error-container">
            <h1>404 - Page non trouvée</h1>
            <p>La page que vous recherchez n'existe pas.</p>
            <a href="/" class="link">Retour à l'accueil</a>
        </div>
    `
}

export const HandleRouting = async () => {
    const path = window.location.pathname

    const initFunc = routes[path]

    if (!initFunc) {
        render404()
        return
    }

    // Call the route handler (handle both sync and async)
    try {
        const result = initFunc()
        if (result && typeof result.then === 'function') {
            await result
        }
    } catch (error) {
        console.error('Error in route handler:', error)
    }
}

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
        handleChatFront()
        return
    }

    if (e.target.id === 'logout-btn' || e.target.id === 'logout-btn-nav') {
        e.preventDefault()
        handleLogoutFront()
        window.history.pushState({}, "", "/")
        HandleRouting()
        return
    }

    // Handle create post close
    if (e.target.classList.contains('closePosrCreat')) {
        e.preventDefault()
        e.target.closest('.creatPostDiv').remove()
        const main = document.querySelector('main')
        if (main) main.style.visibility = 'visible'
    }

})


window.onpopstate = HandleRouting
HandleRouting()