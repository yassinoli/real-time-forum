let socket = null
const ports = new Map()

function broadcast(data) {
    ports.forEach(port => port.postMessage(data))
}

onconnect = function (e) {
    const port = e.ports[0]
    const key = crypto.randomUUID()

    ports.set(key, port)

    port.postMessage({
        event: "connected",
        portKey: key
    })

    port.onmessage = function (event) {
        const msg = event.data

        switch (msg.type) {

            case "connect": {
                if (!socket) {
                    socket = new WebSocket("ws://localhost:8080/ws/chat")

                    socket.onopen = () => {
                        broadcast({ event: "ws-open" })
                    }

                    socket.onmessage = (e) => {
                        try {
                            const data = JSON.parse(e.data)

                            if (data.event === "history") ports.get(data.portKey).postMessage(data)       
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
                    socket.send(JSON.stringify(msg.payload))
                }

                break
            }

            case "send": {

                socket.send(JSON.stringify(msg.payload))

                break
            }

            case "disconnect-tab": {
                ports.delete(msg.portKey)
                break
            }

            case "logout": {
                ports.forEach(port => port.close())
                socket.close()
            }
        }
    }

    port.start()
}