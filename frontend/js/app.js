import { HandleRouting } from "./router.js"
import { checkAuth } from "./utils/utils.js"

const homeTemplate = () => {
    return `
        <div class="home-content">
            <h1>Welcome to the Forum</h1>
            <p>Please login or register to access the forum</p>
            <br>
            <nav class="home-nav">
                <a href="/register" class="link" style="padding: 0.75rem 1.5rem; background-color: var(--primary-color); color: white; text-decoration: none; border-radius: var(--radius-sm); font-weight: 600; transition: all 0.2s;">Register</a>
                <a href="/login" class="link" style="padding: 0.75rem 1.5rem; background-color: var(--surface); color: var(--primary-color); text-decoration: none; border: 1px solid var(--primary-color); border-radius: var(--radius-sm); font-weight: 600; transition: all 0.2s;">Login</a>
            </nav>
        </div>
    `
}

export const handleRoot = async () => {
    const user =  checkAuth()

    if (user.loggedIn) {
        window.history.pushState({}, "", "/posts")
        HandleRouting()
    } else {
        document.getElementById('main-container').innerHTML = ``
        document.getElementById('nav-bar').innerHTML = homeTemplate()
    }

}
