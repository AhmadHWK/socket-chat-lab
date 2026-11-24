# Multi-Client HTTP/JSON Chat Server
**Network Programming Lab Project**

A synchronous multi-client chat server built with **pure Python `socket`** (no frameworks) and a responsive **HTML5/CSS3/Vanilla JS** frontend. Communication uses manual HTTP/JSON with CORS support. Designed for network analysis with Wireshark.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Testing & Verification](#testing--verification)
- [Wireshark Network Capture](#wireshark-network-capture)
- [Architecture](#architecture)

---

## Project Overview

| Component | Technology |
|-----------|------------|
| Backend | Python 3, `socket` only (no Flask/Django/FastAPI) |
| Concurrency | `threading` — one thread per client |
| Protocol | HTTP/1.1 + JSON body + CORS headers |
| Frontend | HTML5, CSS3, Vanilla JS (mobile-first responsive) |
| Server Binding | `0.0.0.0:8080` (accessible from mobile on same Wi-Fi) |

---

## Repository Structure

```
Networking_Lab_Project/
├── backend/
│   ├── server.py          # Main socket server (socket + threading + HTTP routing)
│   └── http_parser.py     # HTTP request parser, response builder, API router
├── frontend/
│   ├── index.html         # Responsive chat UI (login modal, messages, input bar)
│   ├── style.css          # Flexbox layout, media queries, chat bubbles
│   └── app.js             # fetch() API client, 1.5s polling, dynamic server URL
├── wireshark_captures/
│   ├── chat_traffic.pcapng    # Wireshark packet capture (to be recorded)
│   └── screenshots/           # Screenshots for documentation
├── TODO.md                # Development checklist
└── README.md              # This file
```

---

## Prerequisites

- **Python 3.10+** (tested with Python 3.15.2)
- A modern web browser (Chrome, Firefox, Edge, Safari)
- **Wireshark** (for Phase 5 network capture)
- Mobile device on the same Wi-Fi network (optional, for cross-device testing)

---

## Quick Start

### 1. Start the Server

```bash
cd backend
python server.py
```

Expected output:
```
[*] Server listening on 0.0.0.0:8080
[*] Waiting for client connections...
```

The server binds to `0.0.0.0`, so it is reachable from:
- **Same PC:** `http://localhost:8080` or `http://127.0.0.1:8080`
- **Mobile on same Wi-Fi:** `http://<PC-IP>:8080` (e.g. `http://192.168.1.10:8080`)

To find your PC's local IP:
- Windows: `ipconfig` → look for IPv4 Address
- Mac/Linux: `ifconfig` or `ip addr`

### 2. Open the Frontend

Open `frontend/index.html` in a browser:
- **Same PC:** Double-click `index.html` or serve via any static server
- **Mobile:** Copy `frontend/` files to a web server, or open `index.html` directly via `file://` (note: CORS may restrict `file://`; use a local server for best results)

### 3. Join the Chat

1. Enter a username and click **Join**
2. The chat interface loads with:
   - Top bar showing connection status and online user count
   - Message area (auto-updates every 1.5 seconds)
   - Bottom input bar to send messages
   - Users sidebar (desktop only)

### 4. Stop the Server

Press `Ctrl+C` in the terminal where `server.py` is running.


---

## API Endpoints

All responses include CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

| Path | Method | Purpose | Request Body | Response |
|------|--------|---------|--------------|----------|
| `*` | `OPTIONS` | CORS preflight | — | `204 No Content` |
| `/status` | `GET` | Server health | — | `{"status": "online", "users_count": N}` |
| `/join` | `POST` | Register user | `{"username": "Alice"}` | `{"status": "joined", "user": "Alice"}` |
| `/send` | `POST` | Send message | `{"user": "Alice", "message": "Hi!"}` | `{"status": "sent", "timestamp": "..."}` |
| `/messages` | `GET` | Get chat history | — | `{"messages": [{"user": "...", "msg": "..."}]}` |
| `/users` | `GET` | Active users | — | `{"active_users": ["Alice", "Bob"]}` |

### Example: Using curl

```bash
# Check server status
curl http://localhost:8080/status

# Join as Alice
curl -X POST http://localhost:8080/join \
  -H "Content-Type: application/json" \
  -d '{"username": "Alice"}'

# Send a message
curl -X POST http://localhost:8080/send \
  -H "Content-Type: application/json" \
  -d '{"user": "Alice", "message": "Hello!"}'

# Get messages
curl http://localhost:8080/messages

# Get active users
curl http://localhost:8080/users

# CORS preflight
curl -X OPTIONS http://localhost:8080/
```

---

## Testing & Verification

| # | Test | Action | Expected Result |
|---|------|--------|-----------------|
| 1 | Server Startup | Run `python server.py` | Listens on `0.0.0.0:8080` without errors |
| 2 | Mobile Responsiveness | Open in mobile browser / device emulation | Layout adapts to screen size; keyboard doesn't break viewport |
| 3 | Phone-to-Server | Open from phone via PC's local IP; `/join` | Join succeeds; username appears in user list |
| 4 | Concurrency | Send messages from PC and phone simultaneously | All messages received; server stays up |
| 5 | Wireshark Capture | Filter `tcp.port == 8080` | TCP/HTTP packets with JSON headers visible |

---

## Wireshark Network Capture

### Setup

1. Install Wireshark (https://www.wireshark.org/)
2. Start Wireshark and select the capture interface:
   - **Same PC testing:** `Adapter for loopback traffic capture`
   - **Phone + PC testing:** `Wi-Fi` interface
3. Apply display filter: `tcp.port == 8080`

### Scenarios to Capture

| Scenario | What to Look For |
|----------|-----------------|
| TCP Three-Way Handshake | `SYN` → `SYN-ACK` → `ACK` between client and server |
| CORS Preflight | `OPTIONS` request → `204 No Content` with CORS headers |
| Message Send | `POST /send` with JSON body → `200 OK` response |
| Concurrent Traffic | Interleaved packets from PC and mobile clients |
| Connection Teardown | `FIN, ACK` packets when closing the session |

4. Save the capture as `wireshark_captures/chat_traffic.pcapng`
5. Take screenshots: Handshake, CORS headers, JSON body, Concurrency
6. Place screenshots in `wireshark_captures/screenshots/`

---

## Architecture

```
[ Client 1: PC Browser ] ---\
                              \
[ Client 2: Mobile Web ] -----> [ Python Socket Server ]
                              /   (0.0.0.0:8080 - Multi-threaded)
[ Client 3: Tablet Web ] ----/                 |
                                               v
                                    [ Wireshark Packet Capture ]
```

### Concurrency Model

- Each client connection spawns a dedicated `threading.Thread`
- Shared data (`messages`, `active_users`) is protected by `threading.Lock()`
- The server accepts connections in the main loop while handler threads process requests independently

### Data Flow

1. Client sends HTTP request → `client_socket.recv(4096)`
2. `parse_http_request()` extracts Method, Path, Headers, JSON body
3. `handle_request()` routes to the appropriate endpoint handler
4. Endpoint handler reads/writes shared data under `data_lock`
5. `build_response()` creates HTTP/1.1 response with CORS headers + JSON body
6. Response sent via `client_socket.sendall()`

---

## License

Educational project — Network Programming Lab.
