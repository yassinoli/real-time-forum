import { HandleRouting } from "../../router.js"
import { handleChatFront } from "../../services/websocket.js"
import { checkAuth } from "../../utils/utils.js"
import { handleLogoutFront } from "../auth/logout.js"

const postsTemplate = () => {
    return `
<div class="user-list-container">
            <h3>Users</h3>
            <div class="user-list-wrapper"></div>
        </div>

        <div class="posts-container">
            <div class="contentWrapper">
                <aside class="sidebar">
                    <div class="categorienews"></div>
                </aside>
                <main></main>
            </div>
        </div>

        <div class="chat-container">
            <div id="messages"></div>

            <div id="chat-input">
                <textarea id="chat-textarea" rows="1" placeholder="Écrire un message…"></textarea>
                <button id="send-btn">📨</button>
            </div>
            
        </div>
    `
}

const createHeader = (auth) => {
    return `
        <header class="forum-header">
            <h1 class="forum-title">
                <a href="/posts" class="link">Forum</a>
            </h1>
            <div class="forum-header-actions">
                <button id="create-post-btn" class="create-post-btn">Create Post</button>
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

export const initPost = async () => {
    const user = await checkAuth()

    if (!user.loggedIn) {
        window.history.pushState({}, "", "/login")
        HandleRouting()
    } else {
        document.getElementById('nav-bar').innerHTML = createHeader(user)
        document.getElementById('main-container').innerHTML = postsTemplate()

        handleChatFront()
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
    }
}