"""
HTTP/JSON Parser & Response Builder — Phase 3
Network Programming Lab Project

Pure Python implementation (no Flask/Django/FastAPI)
Handles: HTTP request parsing, JSON body extraction, CORS response building, API routing
"""

import json
from datetime import datetime

# ---------------------------------------------------------------------------
# Mandatory CORS headers (required for browser fetch() requests)
# ---------------------------------------------------------------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def parse_http_request(raw_data):
    """
    Parse raw HTTP request bytes into a structured dict.

    Args:
        raw_data: bytes received from client_socket.recv()

    Returns:
        dict with keys: method, path, version, headers, body
        None if parsing fails
    """
    try:
        text = raw_data.decode("utf-8")
    except UnicodeDecodeError:
        return None

    # Split headers from body
    if "\r\n\r\n" in text:
        header_part, body = text.split("\r\n\r\n", 1)
    else:
        header_part = text
        body = ""

    # Split into lines
    lines = header_part.split("\r\n")
    if not lines or not lines[0].strip():
        return None

    # Parse request line: METHOD /path HTTP/1.1
    request_line = lines[0].strip()
    parts = request_line.split(" ")
    if len(parts) < 2:
        return None

    method = parts[0].upper()
    path = parts[1]
    version = parts[2] if len(parts) > 2 else "HTTP/1.1"

    # Parse headers
    headers = {}
    for line in lines[1:]:
        if ": " in line:
            key, value = line.split(": ", 1)
            headers[key.strip()] = value.strip()

    # Parse JSON body based on Content-Length
    parsed_body = None
    content_length = int(headers.get("Content-Length", 0))
    if body and content_length > 0:
        try:
            parsed_body = json.loads(body[:content_length])
        except json.JSONDecodeError:
            parsed_body = body  # fallback to raw string

    return {
        "method": method,
        "path": path,
        "version": version,
        "headers": headers,
        "body": parsed_body,
    }

def build_response(status_code, status_text, body=None, extra_headers=None):
    """
    Build an HTTP/1.1 response as bytes.

    Args:
        status_code: int (200, 204, 400, 404)
        status_text: str (OK, No Content, Bad Request, Not Found)
        body: dict or str to serialize as JSON body
        extra_headers: dict of additional headers

    Returns:
        bytes: complete HTTP response including headers and body
    """
    # Start line
    response_lines = [f"HTTP/1.1 {status_code} {status_text}"]

    # Mandatory CORS headers (added to every response)
    for key, value in CORS_HEADERS.items():
        response_lines.append(f"{key}: {value}")

    # Content-Type
    response_lines.append("Content-Type: application/json")

    # Keep connection alive for subsequent requests (e.g. POST after OPTIONS preflight)
    response_lines.append("Connection: keep-alive")

    # Extra headers
    if extra_headers:
        for key, value in extra_headers.items():
            response_lines.append(f"{key}: {value}")

    # Serialize body
    body_bytes = b""
    if body is not None:
        if isinstance(body, dict):
            body_str = json.dumps(body)
        else:
            body_str = str(body)
        body_bytes = body_str.encode("utf-8")

    # Always include Content-Length (0 for empty body) so browsers know response is complete
    response_lines.append(f"Content-Length: {len(body_bytes)}")

    # End of headers (blank line) — HTTP requires \r\n\r\n to end headers
    response_lines.append("")
    response_lines.append("")  # Second empty string produces the final \r\n via join

    # Combine headers and body
    header_str = "\r\n".join(response_lines)
    return header_str.encode("utf-8") + body_bytes

def handle_request(parsed_request, messages, active_users, data_lock):
    """
    Route the parsed HTTP request to the appropriate endpoint handler.

    API Endpoints:
        OPTIONS *      -> 204 No Content + CORS (preflight)
        GET  /status   -> {"status": "online", "users_count": N}
        POST /join     -> {"status": "joined", "user": "Alice"}
        POST /send     -> {"status": "sent", "timestamp": "..."}
        GET  /messages -> {"messages": [{"user": "...", "msg": "..."}]}
        GET  /users    -> {"active_users": ["Alice", "Bob"]}

    Args:
        parsed_request: dict from parse_http_request()
        messages: shared message history list
        active_users: shared active users list
        data_lock: threading.Lock() for thread safety

    Returns:
        bytes: HTTP response ready to send via client_socket.sendall()
    """
    method = parsed_request.get("method")
    path = parsed_request.get("path")
    body = parsed_request.get("body")

    # --- CORS preflight ---
    if method == "OPTIONS":
        return build_response(204, "No Content")

    # --- GET /status — server health check ---
    if method == "GET" and path == "/status":
        with data_lock:
            count = len(active_users)
        return build_response(200, "OK", {"status": "online", "users_count": count})

    # --- POST /join — register a new user ---
    if method == "POST" and path == "/join":
        username = body.get("username") if isinstance(body, dict) else None
        if not username:
            return build_response(400, "Bad Request", {"error": "Missing username"})
        with data_lock:
            if username in active_users:
                return build_response(400, "Bad Request", {"error": "User already joined"})
            active_users.append(username)
        return build_response(200, "OK", {"status": "joined", "user": username})

    # --- POST /send — send a chat message ---
    if method == "POST" and path == "/send":
        user = body.get("user") if isinstance(body, dict) else None
        message = body.get("message") if isinstance(body, dict) else None
        if not user or not message:
            return build_response(400, "Bad Request", {"error": "Missing user or message"})
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with data_lock:
            messages.append({"user": user, "msg": message, "timestamp": timestamp})
        return build_response(200, "OK", {"status": "sent", "timestamp": timestamp})

    # --- GET /messages — retrieve message history ---
    if method == "GET" and path == "/messages":
        with data_lock:
            msg_list = [{"user": m["user"], "msg": m["msg"]} for m in messages]
        return build_response(200, "OK", {"messages": msg_list})

    # --- GET /users — retrieve active users ---
    if method == "GET" and path == "/users":
        with data_lock:
            users = list(active_users)
        return build_response(200, "OK", {"active_users": users})

    # --- Unknown path ---
    return build_response(404, "Not Found", {"error": "Not Found"})