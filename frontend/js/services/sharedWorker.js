let socket = null
const ports = new Map()

function broadcast(data) {
    ports.forEach(port => port.postMessage(data))
}

onconnect = function (e) {
    const port = e.ports[0]
    const key = crypto.randomUUID()

    ports.set(key, port)

    console.log(ports, 1)

    port.postMessage({
        event: "connected",
        portKey: key
    })

    port.onmessage = function (event) {
        const msg = event.data

        switch (msg.type) {

            case "connect": {
                if (!socket) {
                    console.log(ports.size, 2)
                    socket = new WebSocket("ws://localhost:8080/ws/chat")

                    socket.onmessage = (e) => {
                        try {
                            const data = JSON.parse(e.data)
                            if (data.event === "history" || data.event === "unread") ports.get(data.portKey).postMessage(data)
                            else broadcast(data)

                        } catch (err) {
                            console.error("WS parse error", err)
                        }
                    }

                    socket.onclose = () => {
                        socket = null
                        broadcast({ event: "ws-close" })
                    }

                    socket.onerror = (err) => {
                        console.error("WS error", err)
                    }
                } else {
                    console.log(ports.size, 3)
                    socket.send(JSON.stringify(msg.payload))
                }

                break
            }

            case "send": {
                console.log(ports.size, 4)
                socket.send(JSON.stringify(msg.payload))
                break
            }

            case "disconnect-tab": {

                ports.delete(msg.portKey)
                console.log(ports.size, 5)
                break
            }

            case "logout": {
                console.log(ports.size, 6)
                socket.close()
            }
        }
    }

    port.start()
}