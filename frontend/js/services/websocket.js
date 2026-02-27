import { AddToChat, setupEventListeners } from "../components/chat/messageInput.js"
import { addTyping, markAsRead, removeTyping, showNewMessage, showOldMessage, updateNotification } from "../components/chat/messageWindow.js"
import { initUserList, insertInList, putOnTop, removeMarker, updateCurrentEl } from "../components/chat/userList.js"
import { HandleRouting } from "../router.js"

export const currentUser = {
    nickName: "",
    socket: null,
    isTyping: false,
}

export const messages = {
    hasmore: true,
    // cursor value (timestamp of the oldest message already loaded)
    oldestTime: 0,
}

export let worker = null
export let workerPort = null
export let portKey = null

export const handleChatFront = (nickName) => {
    if (workerPort && portKey) {
        workerPort.postMessage({ type: "disconnect-tab", portKey })
        workerPort.close()
    }

    currentUser.nickName = nickName

    worker = new SharedWorker("/statics/js/services/sharedWorker.js")
    workerPort = worker.port

    workerPort.start()

    workerPort.postMessage({
        type: "connect", payload: {
            type: "reconnect",
            sender: nickName,
        }
    })

    setupEventListeners()

    workerPort.onmessage = (event) => {
        const data = event.data

        switch (data.event) {

            case "connected": {
                portKey = data.portKey
                break
            }

            case "ws-close": {
                workerPort.postMessage({ type: "logout" })
                workerPort.close()
                // Do not redirect on WS close to avoid loop between browsers
                break
            }

            case "init": {
                console.log(data)
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
                    markAsRead(data.message)

                } else {
                    showNewMessage(data.message, list)
                }
                break
            }

            case "unread": {
                updateNotification(data.receiver, data.amount)
                break
            }

            case "own-message": {
                if (document.getElementById("receiver")?.textContent === data.message.receiver) AddToChat(data.message)

                putOnTop(data.message.receiver)

                break
            }


            case "history":
                showOldMessage(data.messages)
                break

            case "read": {
                document.getElementById(data.target).querySelector(".msg-notif")?.remove()
                break
            }

            case "join": {
                const el = document.getElementById(data.newcomer)
                if (!el) insertInList(data.newcomer)
                else updateCurrentEl(el, data.newcomer)
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
        workerPort.postMessage({ type: "disconnect-tab", portKey })
    })

}