import { HandleRouting } from './router.js'

export const handleregisterFront = async () => {
    const userData = {}

    const gender = document.querySelector('input[name="gender"]:checked')
    if (!gender) {
        const errorDiv = document.querySelector(".input-error")
        if (errorDiv) errorDiv.textContent = "Please select a gender"
        return
    }
    userData.gender = gender.value

    const firstName = document.getElementById("firstName")?.value
    const lastName = document.getElementById("lastName")?.value
    const nickName = document.getElementById("nickName")?.value
    const age = document.getElementById("age")?.value
    const email = document.getElementById("email")?.value
    const password = document.getElementById("password")?.value

    if (!firstName || !lastName || !nickName || !age || !email || !password) {
        const errorDiv = document.querySelector(".input-error")
        if (errorDiv) errorDiv.textContent = "Please fill all fields"
        return
    }

    userData.firstName = firstName
    userData.lastName = lastName
    userData.nickname = nickName
    userData.age = Number(age)
    userData.email = email
    userData.password = password

    const errorDiv = document.querySelector(".input-error")
    
    try {
        const resp = await fetch("/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(userData)
        })

        const res = await resp.json()

        if (!resp.ok || res.code !== 200) {
            if (errorDiv) {
                errorDiv.textContent = res.error || res.message || "Registration failed"
            }
            return
        }

        // Redirect to posts after successful registration
        window.history.pushState({}, "", "/posts")
        HandleRouting()

    } catch (err) {
        console.error(err)
        if (errorDiv) {
            errorDiv.textContent = "An error occurred. Please try again."
        }
    }
}