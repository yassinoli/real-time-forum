import { HandleRouting } from './router.js'

export const handleregisterFront = async () => {
    const userData = {}
    const errorDiv = document.querySelector(".input-error")

    const gender = document.querySelector('input[name="gender"]:checked')
    if (!gender) {
        errorDiv.textContent = "Please select a gender"
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
        errorDiv.textContent = "Please fill all fields"
        return
    }

    userData.firstName = firstName
    userData.lastName = lastName
    userData.nickname = nickName
    userData.age = Number(age)
    userData.email = email
    userData.password = password

    try {
        const resp = await fetch("/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(userData)
        })

        const res = await resp.json()

        if (!resp.ok || res.code !== 200) {
            errorDiv.textContent = res.error || res.message || "Registration failed"
            return
        }

        // Redirect to posts after successful registration
        window.history.pushState({}, "", "/posts")
        HandleRouting()

    } catch (err) {
        console.error(err)
        errorDiv.textContent = "An error occurred. Please try again."
    }
}