// SharedWorker: owns the single WebSocket connection, broadcasts to all tabs
const ports = []
let socket = null
let isConnecting = false
let reconnectAttempts = 0
let currentNickname = null
let shouldReconnect = true
const MAX_RECONNECT_DELAY = 10000

function broadcast(data) {
    // Clean dead ports while broadcasting
    for (let i = ports.length - 1; i >= 0; i--) {
        try {
            ports[i].postMessage(data)
        } catch (_) {
            ports.splice(i, 1)
        }
    }
}

function connectWebSocket() {
    if (socket && socket.readyState <= WebSocket.OPEN) return
    if (isConnecting) return

    isConnecting = true
    shouldReconnect = true

    socket = new WebSocket("ws://localhost:8080/ws/chat")

    socket.onopen = () => {
        isConnecting = false
        reconnectAttempts = 0
        broadcast({ type: "ws-status", status: "open" })
    }

    socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data)

            // Track nickname from init events so new tabs can auto-reconnect
            if (data.event === "init" && data.nickname) {
                currentNickname = data.nickname
            }

            broadcast({ type: "ws-message", payload: data })
        } catch (err) {
            console.error("SharedWorker: failed to parse WS message", err)
        }
    }

    socket.onerror = () => {
        isConnecting = false
        broadcast({ type: "ws-status", status: "error" })
    }

    socket.onclose = () => {
        isConnecting = false
        socket = null
        broadcast({ type: "ws-status", status: "closed" })

        // Only auto-reconnect if not explicitly disconnected (logout)
        if (shouldReconnect && ports.length > 0) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY)
            reconnectAttempts++
            setTimeout(() => {
                if (shouldReconnect) connectWebSocket()
            }, delay)
        }
    }
}

function disconnectWebSocket() {
    shouldReconnect = false
    if (socket) {
        socket.close()
        socket = null
    }
    currentNickname = null
    reconnectAttempts = 0
    isConnecting = false
}

function sendToSocket(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data))
    }
}

// Handle new tab connections
self.onconnect = (e) => {
    const port = e.ports[0]
    ports.push(port)

    port.onmessage = (event) => {
        const msg = event.data

        switch (msg.type) {
            case "connect":
                connectWebSocket()
                if (socket.readyState === WebSocket.CONNECTING) {
                    socket.addEventListener('open', () => {
                        sendToSocket(msg.payload)
                    }, { once: true })
                } else {
                    sendToSocket(msg.payload)
                }
                break

            case "disconnect":
                disconnectWebSocket()
                break

            case "send":
                sendToSocket(msg.payload)
                break

            case "reconnect":
                sendToSocket(msg.payload)
                break
        }
    }

    // If WS is already open (another tab connected first),
    // notify the new tab and auto-request user list from the server
    if (socket && socket.readyState === WebSocket.OPEN) {
        port.postMessage({ type: "ws-status", status: "open" })

        if (currentNickname) {
            sendToSocket({ sender: currentNickname, type: "reconnect" })
        }
    }

    port.start()
}
