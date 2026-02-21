# Real-Time Forum

A robust, real-time web application featuring multi-tab synchronization, instant messaging, and forum capabilities. Built with a Go backend and a modern Vanilla JS frontend utilizing `SharedWorker` for high-performance communication.

## 🚀 Key Features

- **Real-Time Synchronized Chat**: Communicate instantly with other users.
- **Multi-Tab Workspace**: Chat stays in sync across multiple browser tabs using a `SharedWorker` and a single WebSocket connection.
- **Forum Messaging**: Create posts, browse the community, and engage in threaded discussions.
- **Dynamic User Tracking**: See who is online and get real-time typing indicators.
- **Secure Persistence**: Powered by SQLite for reliable data storage and history loading.
- **Responsive Design**: Fully functional across desktop and mobile devices.

## 🛠️ Tech Stack

- **Backend**: [Go](https://go.dev/) (Standard Library, Gorilla WebSocket)
- **Frontend**: Vanilla JavaScript (ES modules, `SharedWorker`, WebSockets)
- **Database**: [SQLite3](https://sqlite.org/)
- **Styling**: Vanilla CSS (Modern CSS variables, Flexbox/Grid)

## 📦 Project Structure

```text
├── backend/            # Go server source code
│   ├── chat_websocket/ # WebSocket hub and broker logic
│   ├── handlers/       # HTTP and API route handlers
│   ├── models/         # Data structures and Hub definition
│   └── main.go         # Server entry point
├── frontend/           # Client-side source code
│   ├── js/             # Component-based JS modules
│   │   ├── services/   # WebSocket and SharedWorker implementations
│   │   └── components/ # UI components (chat, posts, auth)
│   ├── css/            # Modular stylesheets
│   └── index.html      # Main entry page
├── database/           # SQLite database and migrations
└── go.mod              # Go dependencies
```

## ⚙️ Setup & Installation

### Prerequisites
- [Go 1.24+](https://go.dev/dl/) installed.
- (Optional) SQLite3 installed for manual database inspection.

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yassinoli/real-time-forum.git
   cd real-time-forum
   ```

2. **Initialize the Backend**:
   Navigate to the backend directory and run the server. The database and tables will be automatically initialized on the first run.
   ```bash
   cd backend
   go run main.go
   ```

3. **Access the Application**:
   Open your browser and navigate to:
   [http://localhost:8080](http://localhost:8080)

## 📡 Real-Time Architecture

This project implements a sophisticated real-time communication layer:
- **SharedWorker**: A single worker script manages the WebSocket connection for all open tabs of the same session. This prevents redundant connections and ensures a unified state across the application.
- **WebSocket Broker**: The backend utilizes a thread-safe broker pattern (Hub) to manage client connections, broadcasting messages, and handling user lifecycle events (join/leave).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for any bugs or feature requests.


