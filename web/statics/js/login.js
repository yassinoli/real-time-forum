import { currentUser } from './chat.js';
import { HandleRouting } from './router.js';


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

    console.log(userCredentials)

    try {
        const resp = await fetch("/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(userCredentials)
        })

        const res = await resp.json()

        if (!resp.ok || res.code !== 200) {
            const errorDiv = document.querySelector(".input-error")
            if (errorDiv) {
                errorDiv.textContent =  "Login failed : inccorect nickName or password " 
            }
            return
        }

        // Redirect to posts after successful login
        window.history.pushState({}, "", "/posts")
        HandleRouting()

    } catch (err) {
        console.error(err)
        const errorDiv = document.querySelector(".input-error")
        if (errorDiv) {
            errorDiv.textContent = "An error occurred. Please try again."
        }
    }
}