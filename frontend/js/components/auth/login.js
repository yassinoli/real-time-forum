import { HandleRouting, renderError, mainCont, navBar } from '../../router.js'
import { request } from '../../services/api.js'
import { checkAuth } from '../../utils/utils.js'

const loginTemplate = () => {
    return `
        <div class="auth-page">
            <div class="auth-card">
                <h1>Login</h1>

                <form class="form-container login" novalidate>
                    <div class="input-error" role="alert"></div>

                    <div class="form-row">
                        <label for="identifier">Email/Nickname:</label>
                        <input 
                            type="text" 
                            id="identifier" 
                            name="identifier" 
                            required 
                            maxlength="50" 
                            autocomplete="username"
                            placeholder="email or nickname">
                    </div>

                    <div class="form-row">
                        <label for="password">Password:</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            required 
                            minlength="6" 
                            maxlength="20"
                            autocomplete="current-password" 
                            placeholder="password">
                    </div>

                    <button type="submit" id="login-submit-btn">Sign in</button>

                    <p>
                        Don't have an account?
                        <a href="/register" class="link">Sign up</a>
                    </p>
                </form>
            </div>
        </div>
    `
}

export async function initLogin() {
     const user =  await checkAuth()
    
        if (user.loggedIn) {
            window.history.pushState({}, "", "/posts")
            HandleRouting()
        } else {
    navBar.innerHTML = ''
    mainCont.innerHTML = loginTemplate()
        }
}

export const handleLoginFront = async () => {
    const userCredentials = {
        nickName: "",
        email: "",
        password: "",
    }

    const errorDiv = document.querySelector(".input-error")

    const identifier = document.getElementById("identifier")?.value
    const password = document.getElementById("password")?.value

    if (!password || !identifier) {
        errorDiv.textContent = "Please fill all the fields"
        return
    }

    if (identifier.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) userCredentials.email = identifier
    else userCredentials.nickName = identifier
    userCredentials.password = password

    const result = await request("/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(userCredentials)
    })

    switch (result.code) {
        case 200: {
            window.history.pushState({}, "", "/posts")
            HandleRouting()
            break
        }

        case 303: {
            window.history.pushState({}, "", "/posts")
            HandleRouting()
            break
        }

        case 400: {
            errorDiv.textContent = result.error
            break
        }

        case 401: {
            errorDiv.textContent = result.error
            break
        }

        default: {
            renderError(result.code, result.error)
            break
        }
    }

}