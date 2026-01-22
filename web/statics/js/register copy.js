import { currentUser } from './chat.js';
import { HandleRouting } from './router.js';

const getData = (userData) => {
    const gender = document.querySelector('input[name="gender"]:checked');
    userData.gender = gender ? gender.value : ""

    const inputs = document.querySelectorAll(".form-row")
    inputs.forEach(el => {
        const data = el.children[1]
        userData[data.id] = data ? data.value : ""
    })

    userData.age = Number(userData.age ??= 0)
}

const verifyData = (userData) => {
    Object.entries(userData).forEach(([key, val]) => {
        const v = String(val).trim()

        if (userData.error) return

        if (!v && v !== 0) {
            userData.error = "please fill all the fields"
            return
        }

        if (key === "firstName") {
            if (!/^[A-Za-z]+$/.test(v)) userData.error = "first name should only contain letters"
            else if (v.length > 15) userData.error = "first name is too long (more than 15 characters)"
            return
        }

        if (key === "lastName") {
            if (!/^[A-Za-z\s]+$/.test(v)) userData.error = "last name should only contain letters or spaces"
            else if (v.length > 30) userData.error = "last name is too long (more than 20 characters)"
            return
        }

        if (key === "nickName") {
            if (/[^A-Za-z0-9 ]/.test(v)) userData.error = "only a word with no special character is allowed for nickname"
            else if (v.length > 20) userData.error = "nickname is too long (more than 20 characters)"
            return
        }

        if (key === "age") {
            if (Number.isNaN(Number(v))) userData.error = "please enter an number for your age"
            else if (Number(v) < 14) userData.error = "you are too young for this website"
            else if (Number(v) > 130) userData.error = "we doubt you are that old"
            return
        }

        if (key === "gender" && v !== "male" && v !== "female") {
            userData.error = "please select a gender (male or female)"
            return
        }

        if (key === "email") {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) userData.error = "please enter a valid email"
            else if (v.length > 50) "maximum characters for an email is 50"
            return
        }

        if (key === "password") {
            if (v.length < 6) userData.error = "password should have at least 6 characters"
            else if (v.length > 20) userData.error = "maximum characters for a password is 20"
            return
        }

    })
}

export const handleregisterFront = async () => {
    const userData = { online: false }

    getData(userData)
    verifyData(userData)


    if (userData.error) {
        const inputError = document.querySelector(".input-error")
        inputError.textContent = userData.error
        inputError.style.display = "block"
        return
    }

    try {
        const resp = await fetch("/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(userData)
        })

        const res = await resp.json()
        currentUser.nickName = userData.nickName

        window.history.pushState({}, "", "/chat")
        HandleRouting()

    } catch (err) {
        console.error(err)
    }

}