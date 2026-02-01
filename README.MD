# Real-Time Forum

A full-stack real-time forum application built with Go, featuring user authentication, public discussions, categorized posts with comments, and instant private messaging via WebSockets.

## Overview

Real-Time Forum is a single-page application (SPA) that provides a modern forum experience with live communication capabilities. Users can register, create and browse posts by category, participate in discussions through comments, and engage in real-time private messaging with other members.

## Features

### User Authentication
- **Registration** — Create accounts with first name, last name, nickname, email, age, and gender
- **Login** — Authenticate via nickname or email with bcrypt-secured passwords
- **Session Management** — Cookie-based sessions with automatic expiration
- **Logout** — Secure session invalidation and cookie removal

### Forum & Content
- **Posts** — Create, view, and browse discussion posts with title and content
- **Categories** — Tag posts with categories for organized filtering
- **Comments** — Add and view comments on posts in real-time
- **Pagination** — Infinite scroll for posts (20 per page, configurable)

### Real-Time Chat
- **Private Messaging** — One-to-one conversations between registered users
- **WebSocket Connection** — Persistent bidirectional communication
- **Online Presence** — See which users are online or offline
- **Message History** — Load past conversations with pagination
- **Read Receipts** — Track unread message counts
- **Ping/Pong** — Connection health monitoring with 60-second keepalive

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Backend    | Go 1.24, standard library `net/http` |
| Database   | SQLite3 (via mattn/go-sqlite3)       |
| WebSocket  | Gorilla WebSocket                   |
| Security   | golang.org/x/crypto/bcrypt          |
| Frontend   | Vanilla JavaScript (ES6 modules)    |
| Styling    | CSS                                 |

## Project Structure

```
real-time-forum/
├── cmd/
│   └── main.go                 # Application entry point, route registration
├── internal/
│   ├── database/
│   │   └── real-time-forum.db  # SQLite database file
│   ├── handlers/               # HTTP and WebSocket handlers
│   │   ├── api.go              # REST API: posts, comments, logout, header
│   │   ├── chat.go             # WebSocket handler and broadcast logic
│   │   ├── home.go             # Main page handler
│   │   ├── login.go            # Login page handler
│   │   ├── logout.go           # Logout handler
│   │   ├── register.go         # Registration page handler
│   │   └── serve.go            # Static file serving
│   ├── helpers/                # Business logic helpers
│   │   ├── comment.go          # Comment operations
│   │   ├── createSession.go    # Session creation
│   │   ├── deleteSession.go    # Session deletion
│   │   ├── getData.go          # Request data parsing
│   │   ├── index.go            # Index/template helpers
│   │   ├── post.go             # Post CRUD operations
│   │   ├── respond.go          # JSON response helpers
│   │   ├── session.go          # Session validation
│   │   └── user.go             # User-related helpers
│   ├── logic/                  # Authentication logic
│   │   ├── login.go            # Login validation and flow
│   │   └── register.go         # Registration validation
│   ├── models/
│   │   ├── query.go            # SQL queries and schema
│   │   └── struct.go           # Data structures
│   └── websocket/
│       └── handler.go          # WebSocket utilities
├── web/
│   ├── index.html              # SPA shell
│   ├── favicon.ico
│   └── statics/
│       ├── assets/             # Images
│       ├── icons/              # UI icons
│       ├── js/                 # Client-side modules
│       │   ├── router.js       # Client-side routing
│       │   ├── home.js         # Posts, infinite scroll, categories
│       │   ├── chat.js         # Private messaging UI
│       │   ├── createPost.js   # Post creation form
│       │   ├── login.js        # Login form
│       │   ├── register.js     # Registration form
│       │   ├── logout.js       # Logout handling
│       │   └── templates.js    # HTML templates
│       ├── home.css
│       └── style.css
├── go.mod
├── go.sum
└── README.md
```

## Architecture

### Request Flow
1. **SPA shell** — `index.html` loads once; `router.js` handles client-side routing
2. **API calls** — Authenticated requests to `/api/*` for JSON data
3. **WebSocket** — `/ws/chat` for real-time chat (requires valid session cookie)

### Authentication
- Session IDs stored in HttpOnly cookies
- Sessions validated against `session` table with expiration
- Protected routes require valid session; unauthenticated users receive `401 Unauthorized`

### WebSocket Events
| Event         | Direction | Description                                  |
| ------------- | --------- | -------------------------------------------- |
| `init`        | Server→Client | Initial user list, chat history metadata |
| `join`        | Server→Client | Notification when a user comes online    |
| `leave`       | Server→Client | Notification when a user goes offline    |
| `chat`        | Bidirectional | Send/receive private messages            |
| `load_history`| Client→Server | Request message history (paginated)      |
| `history`     | Server→Client | Message history response                  |
| `reload`      | Client→Server | Refresh user list                         |

## API Reference

| Method | Endpoint            | Auth | Description                    |
| ------ | ------------------- | ---- | ------------------------------ |
| GET    | `/api/posts`        | Yes  | List posts (query: `offset`, `limit`) |
| GET    | `/api/post?id=`     | Yes  | Get single post with comments  |
| POST   | `/api/posts/create` | Yes  | Create post (form: `title`, `content`, `categories`) |
| POST   | `/api/comments/add` | Yes  | Add comment (form: `post_id`, `content`) |
| GET    | `/api/header-check` | No   | Check auth status, return nickname      |
| POST   | `/api/logout`       | No   | Logout and invalidate session  |
| POST   | `/register`         | No   | Register (JSON body)           |
| POST   | `/login`            | No   | Login (JSON body)              |
| GET    | `/ws/chat`          | Yes  | WebSocket upgrade for chat     |

## Database Schema

- **user** — id, first_name, last_name, nickname, email, age, gender, password
- **session** — id, user_id, expire_at
- **post** — id, user_id, title, content, created_at
- **comment** — id, post_id, user_id, content, created_at
- **category** — id, type
- **post_category** — post_id, category_id (many-to-many)
- **private_message** — id, sender_id, receiver_id, content, is_read, created_at

Foreign keys are enforced; cascading deletes apply where appropriate.

## Getting Started

### Prerequisites
- Go 1.24 or later
- CGO enabled (required for SQLite driver)

### Installation
```bash
# Clone the repository
git clone <https://github.com/yassinoli/real-time-forum.git>
cd real-time-forum

# Install dependencies
go mod download

# Run the application
go run cmd/main.go
```

### Usage
1. Open `http://localhost:8080` in a browser
2. Register a new account or log in
3. Browse posts, create new ones, add comments
4. Use the chat interface to message other users in real time


