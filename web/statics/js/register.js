import { generateRegisterPage } from "./pages/registerPage.js"

generateRegisterPage()

const handleregisterFront = async () => {
    const userData = {}

    const gender = document.querySelector('input[name="gender"]:checked');
    userData.gender = gender.value;

    const inputs = document.querySelectorAll(".form-row")
    inputs.forEach(el => {
        userData[el.children[1].id] = el.children[1].value
    })

    userData.age = Number(userData.age)

    try {
        const resp = await fetch("/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(userData)
        })

        if (!resp.ok) throw new Error("failed to send data")

        const res = await resp.json()

        const ws = new WebSocket("ws://localhost:8080/ws");

        ws.onopen = () => {
            console.log("WebSocket connecté");
            ws.send("hello server");
        };

        ws.onmessage = (event) => {
            console.log("message reçu du serveur:", event.data);
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
        };

        ws.onclose = () => {
            console.log("WebSocket fermé");
        };


        // document.body.innerHTML = `
        //     <div id="message-container">
        //     <h1>${res.code}</h1>
        //     <p>${res.message}</p>
        //     </div>
        // `

    } catch (err) {
        console.error(err)
    }

}

document.getElementById("submit-btn").addEventListener("click", handleregisterFront)