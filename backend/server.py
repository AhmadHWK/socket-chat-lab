"""
Multi-Client HTTP/JSON Chat Server — Phase 3: Custom HTTP/JSON Engine
Network Programming Lab Project

Backend: Python `socket` only (no Flask/Django/FastAPI)
Binding: 0.0.0.0:8080 (allows mobile access via local network IP)
Concurrency: threading.Thread per client connection
Protocol: HTTP/1.1 + JSON body + CORS headers
"""

import socket
import threading
import sys

# Import HTTP parser and response builder from Phase 3
from http_parser import parse_http_request, build_response, handle_request

HOST = "0.0.0.0"
PORT = 8080
BUFFER_SIZE = 4096

# ---------------------------------------------------------------------------
# Thread-safe shared data structures (Phase 2)
# ---------------------------------------------------------------------------
messages = []          # Message history buffer: [{"user": "...", "msg": "...", "timestamp": "..."}]
active_users = []      # List of connected usernames: ["Alice", "Bob", ...]
clients = {}           # Map client_socket -> client_address for tracking
data_lock = threading.Lock()  # Protects messages and active_users from race conditions


# ---------------------------------------------------------------------------
# Client handler (Phase 2 + Phase 3)
# ---------------------------------------------------------------------------
def client_handler(client_socket, client_address):
    """
    Handle a single client connection in a dedicated thread.
    Receives HTTP requests, parses them, routes to endpoints, sends responses.
    """
    try:
        while True:
            # Receive data from the client
            data = client_socket.recv(BUFFER_SIZE)
            if not data:
                # Client closed the connection
                break

            # Phase 3: Parse the raw HTTP request
            parsed = parse_http_request(data)
            if parsed is None:
                # Malformed request → 400 Bad Request
                response = build_response(400, "Bad Request", {"error": "Malformed request"})
                client_socket.sendall(response)
                continue

            # Log the parsed request for debugging
            print(f"[*] {client_address} -> {parsed['method']} {parsed['path']}")

            # Phase 3: Route the request and build the HTTP response
            response = handle_request(parsed, messages, active_users, data_lock)

            # Send the response back to the client
            client_socket.sendall(response)

    except ConnectionResetError:
        print(f"[-] Connection reset by {client_address}")
    except Exception as e:
        print(f"[-] Error with {client_address}: {e}")
    finally:
        client_socket.close()
        print(f"[-] Connection closed with {client_address}")


# ---------------------------------------------------------------------------
# Server entry point (Phase 1 + Phase 2 + Phase 3)
# ---------------------------------------------------------------------------
def start_server():
    """Create, bind, and listen on a TCP socket. Accept clients and spawn threads."""
    # Create TCP socket (IPv4, stream-based)
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # Allow immediate port rebinding after server restart
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # Bind to all interfaces on port 8080 (allows mobile access via LAN)
    server_socket.bind((HOST, PORT))

    # Start listening for incoming connections
    server_socket.listen(5)

    print(f"[*] Server listening on {HOST}:{PORT}")
    print("[*] Waiting for client connections...")

    try:
        while True:
            # Accept an incoming client connection
            client_socket, client_address = server_socket.accept()
            print(f"[+] Connection accepted from {client_address[0]}:{client_address[1]}")

            # Phase 2: spawn a dedicated thread for this client
            client_thread = threading.Thread(
                target=client_handler,
                args=(client_socket, client_address),
                daemon=True
            )
            client_thread.start()
            print(f"[+] Thread started for client {client_address}")

    except KeyboardInterrupt:
        print("\n[!] Server shutting down...")
    finally:
        server_socket.close()
        print("[*] Server socket closed.")


if __name__ == "__main__":
    start_server()
