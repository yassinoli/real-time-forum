import { HandleRouting, renderError, mainCont, navBar } from '../../router.js'
import { request } from '../../services/api.js'

const registerTemplate = () => {
    return `
        <div class="auth-page">
            <div class="auth-card">
                <h1>Register</h1>

                <div class="form-container register">
                    <div class="input-error"></div>

                    <div class="form-row">
                        <label for="firstName">First name:</label>
                        <input type="text" id="firstName" name="first-name" required maxlength="15">
                    </div>

                    <div class="form-row">
                        <label for="lastName">Last name:</label>
                        <input type="text" id="lastName" name="last-name" required maxlength="30">
                    </div>

                    <div class="form-row">
                        <label for="nickName">Nickname:</label>
                        <input type="text" id="nickName" name="nickname" required maxlength="20">
                    </div>

                    <div class="form-row">
                        <label for="age">Age:</label>
                        <input type="number" id="age" name="age" required>
                    </div>
                    
                    <div id="gender-container">
                        <label>Gender:</label>
                        <div class="gender-input">
                            <label>
                                <input type="radio" id="male" name="gender" value="male">
                                Male
                            </label>
                            <label>
                                <input type="radio" id="female" name="gender" value="female">
                                Female
                            </label>
                        </div>
                    </div>

                    <div class="form-row">
                        <label for="email">E-mail:</label>
                        <input type="email" id="email" name="email" required maxlength="50">
                    </div>

                    <div class="form-row">
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required maxlength="20" minlength="6">
                    </div>

                    <button id="register-submit-btn">Sign Up</button>

                    <p>You already have an account?
                        <a href="/login" class="link">Sign in</a>
                    </p>
                </div>
            </div>
        </div>
    `
}

export const initRegister = () => {
    navBar.innerHTML = ''
    mainCont.innerHTML = registerTemplate()
}

export const handleregisterFront = async () => {
    const userData = {}
    const errorDiv = document.querySelector(".input-error")

    const firstName = document.getElementById("firstName")?.value
    const lastName = document.getElementById("lastName")?.value
    const nickName = document.getElementById("nickName")?.value
    const age = document.getElementById("age")?.value
    const email = document.getElementById("email")?.value
    const password = document.getElementById("password")?.value
    const gender = document.querySelector('input[name="gender"]:checked')

    if (!firstName || !lastName || !nickName || !age || !email || !password || !gender) {
        errorDiv.textContent = "Please fill all fields"
        return
    }

    userData.firstName = firstName
    userData.lastName = lastName
    userData.nickname = nickName
    userData.gender = gender.value
    userData.age = Number(age)
    userData.email = email
    userData.password = password

    const result = await request("/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(userData)
    })

    if (result.success) {
        window.history.pushState({}, "", "/posts")
        HandleRouting()
        
    } else if ( [400, 409].includes(result.code) ){
        errorDiv.textContent = result.error
        
    } else {
        renderError(result.error, result.error)
    }

}