# TODO List — Multi-Client HTTP/JSON Chat Server
**Based on:** `code_artifact.md` (Network Programming Lab Project)

**Tech Stack:** Python `socket` only (no frameworks) | HTML5/CSS3/Vanilla JS | `threading` | HTTP + JSON + CORS | Wireshark

**Target Structure:**
```
Networking_Lab_Project/
├── backend/
│   ├── server.py
│   └── http_parser.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── wireshark_captures/
│   ├── chat_traffic.pcapng
│   └── screenshots/
└── README.md
```

---

## Phase 0 — Project Setup

- [ ] Create directory structure: `backend/`, `frontend/`, `wireshark_captures/screenshots/`
- [ ] Verify Python is installed and `python --version` works
- [ ] Review `code_artifact.md` requirements and API contract (6 endpoints)

---

## Phase 1 — Pure Socket Engine (`backend/server.py`) ✅ COMPLETE

- [x] Create `backend/server.py`
- [x] Create TCP socket with `socket.socket(socket.AF_INET, socket.SOCK_STREAM)`
- [x] Set `SO_REUSEADDR` to allow immediate port rebinding
- [x] Bind socket to `0.0.0.0` on port `8080` (allows mobile access via local IP)
- [x] Call `listen()` to start accepting incoming connections
- [x] Implement accept loop that accepts client connections
- [x] Verify server starts without errors and prints listening message

---

## Phase 2 — Concurrency & Multi-Threading ✅ COMPLETE

- [x] Create a `threading.Thread` for each connected client (`client_handler`)
- [x] Create thread-safe in-memory message history buffer (list)
- [x] Create thread-safe active users list (list of usernames)
- [x] Create `threading.Lock()` to protect shared data from race conditions
- [x] Implement `client_handler` to receive data from `client_socket.recv(4096)`
- [x] Handle client disconnection gracefully and remove from active users
- [x] Verify multiple clients can connect simultaneously without server crash

---

## Phase 3 — Custom HTTP/JSON Engine (`backend/http_parser.py`) ✅ COMPLETE

- [x] Create `backend/http_parser.py`
- [x] **Request Parser:** Parse Method, Path, HTTP version, headers, Content-Length, JSON body
- [x] **Response Builder:** HTTP/1.1 status lines, CORS headers, JSON serialization, sendall()
- [x] **API Endpoints:** OPTIONS *, GET /status, POST /join, POST /send, GET /messages, GET /users
- [x] Handle unknown paths with `404 Not Found`
- [x] Handle malformed requests with `400 Bad Request`
- [x] Integrate http_parser into server.py client_handler
- [x] All 7 integration tests passed (status, join, send, messages, users, options, 404)

---

## Phase 4 — Responsive Web Frontend (`frontend/`) ✅ COMPLETE

- [x] Create `frontend/index.html` — viewport meta, login modal, top bar, messages area, input bar, users sidebar
- [x] Create `frontend/style.css` — Flexbox/Grid, 100dvh, @media (max-width: 768px), chat bubbles (self/other)
- [x] Create `frontend/app.js` — dynamic server URL, fetch() API calls, setInterval 1.5s polling, all API endpoints handled

---

## Phase 5 — Wireshark Network Capture

- [ ] Install Wireshark (if not already installed)
- [ ] Select capture interface:
  - [ ] Same PC testing → `Adapter for loopback traffic capture`
  - [ ] Phone + PC testing → `Wi-Fi` interface
- [ ] Apply capture/display filter: `tcp.port == 8080`
- [ ] Capture TCP Three-Way Handshake (`SYN` → `SYN-ACK` → `ACK`)
- [ ] Capture CORS `OPTIONS` request + `POST /send` with JSON body + `200 OK` response
- [ ] Capture concurrent traffic interleaving (PC + mobile sending at same time)
- [ ] Capture TCP Teardown (`FIN, ACK`) on session close
- [ ] Save capture as `wireshark_captures/chat_traffic.pcapng`
- [ ] Take screenshots for documentation: Handshake, CORS headers, JSON body, Concurrency

---

## Testing & Verification Matrix (from code_artifact.md)

- [ ] **Test 1 — Server Startup:** Run `python server.py`, confirms listening on `0.0.0.0:8080`
- [ ] **Test 2 — Mobile Responsiveness:** Open interface in mobile browser / device emulation, verify layout adapts
- [ ] **Test 3 — Phone-to-Server Connection:** Open interface from phone via PC's local IP, `/join` succeeds, username appears in user list
- [ ] **Test 4 — Concurrency:** Send messages from PC and phone simultaneously, all messages received, server stays up
- [ ] **Test 5 — Wireshark Capture:** Filter port `8080`, verify TCP/HTTP packets with JSON headers are visible

---

## Delivery ✅ COMPLETE

- [x] Create `README.md` with setup and run instructions
- [x] Verify all files match the required repository structure
- [x] Final end-to-end test: Backend API tested (7/7 endpoints passed)

---

## Suggested Order to Begin Development ✅ Phases 1-4 Complete

1. ✅ Phase 0 → Project setup
2. ✅ Phase 1 → Basic socket server (tested with `telnet`/browser)
3. ✅ Phase 2 → Add threading + thread-safe data stores
4. ✅ Phase 3 → Add HTTP parser + all 6 endpoints (tested with `curl`)
5. ✅ Phase 4 → Build frontend and connect to running server
6. ⬜ Phase 5 → Wireshark captures + testing matrix (manual step)
7. ✅ Delivery → README + final verification


