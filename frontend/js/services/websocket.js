import { AddToChat, setupEventListeners } from "../components/chat/messageInput.js"
import { addTyping, removeTyping, showNewMessage, showOldMessage, updateNotification } from "../components/chat/messageWindow.js"
import { initUserList, insertInList, removeMarker, updateCurrentEl } from "../components/chat/userList.js"

export const currentUser = {
    nickName: "",
    socket: null,
    isTyping: false,
}

export const messages = {
    hasmore: true,
    currentOffset: 0,
}

export let worker = null
export let workerPort = null

export const handleChatFront = () => {
    if (worker) {
        workerPort.postMessage({
            type: "send",
            payload: {
                type: "reconnect",
                sender: currentUser.nickName,
            }
        })

        return
    }

    worker = new SharedWorker("/statics/js/services/sharedWorker.js")
    workerPort = worker.port

    workerPort.start()

    workerPort.postMessage({ type: "connect" })

    setupEventListeners()

    workerPort.onmessage = (event) => {
        const data = event.data

        switch (data.event) {

            case "ws-open":
                console.log("WS connected via SharedWorker")
                break

            case "init": {
                if (data.users.length === 0) {
                    document.querySelector(".user-list-wrapper")
                        .textContent = `You are the only user for now`
                } else {
                    initUserList(data)
                }
                break
            }

            case "chat": {
                const receiver = document.getElementById("receiver")
                const list = document.querySelector(".user-list-wrapper")

                if (!receiver || receiver.textContent !== data.message.sender) {
                    updateNotification(list, data.message.sender)
                } else {
                    showNewMessage(data.message, list)
                }
                break
            }

            case "own-message":
                AddToChat(data.message)
                break

            case "history":
                showOldMessage(data.messages)
                break

            case "join": {
                const el = document.getElementById(data.newcommers)
                if (!el) insertInList(data.newcommers)
                else updateCurrentEl(el, data.newcommers)
                break
            }

            case "leave":
                removeMarker(data.left)
                if (document.getElementById("receiver")?.textContent === data.left) {
                    removeTyping()
                }
                break

            case "typing":
                addTyping(data.typer)
                break

            case "stop-typing":
                removeTyping()
                break
        }
    }

    window.addEventListener("beforeunload", () => {
        workerPort.postMessage({ type: "disconnect-tab" })
    })
}