import { HandleRouting, renderError } from '../../router.js'

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

export const initLogin = (mainCont, navBar) => {
    navBar.innerHTML = ''
    mainCont.innerHTML = loginTemplate()
}

export const handleLoginFront = async () => {
    const userCredentials = {
        nickName: "",
        email: "",
        password: "",
    }

    const identifier = document.getElementById("identifier").value
    const password = document.getElementById("password").value

    if (!password || !identifier) {
        document.querySelector(".input-error").textContent = "please fill all the fields"
        return
    }

    if (String(identifier).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) userCredentials.email = identifier
    else userCredentials.nickName = identifier
    userCredentials.password = password


    try {
        const resp = await fetch("/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(userCredentials)
        })

        const res = await resp.json()

        if (!resp.ok) {
            if (res.code === 400 || res.code === 401) {
                const errorDiv = document.querySelector(".input-error")
                errorDiv.textContent = res.error
                return
            }

            if (res.code === 500) {
                renderError(500, res.Error, document.getElementById('main-container'), document.getElementById('nav-bar'))
                return
            }
        }

        window.history.pushState({}, "", "/posts")
        HandleRouting()

    } catch (err) {
        console.error(err)
        const errorDiv = document.querySelector(".input-error")
        if (errorDiv) {
            errorDiv.textContent = "failed to login try with a correct information."
        }
    }
}