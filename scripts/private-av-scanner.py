"""Private ClamAV adapter for the existing Supabase scanner contract.
Bind loopback only, behind a privately managed TLS reverse proxy. No public scanning service.
Run with an unprivileged service account and a local clamd Unix socket.
"""
import hashlib
import hmac
import json
import os
import socket
import struct
from http.server import BaseHTTPRequestHandler, HTTPServer

MAX_BYTES = 10 * 1024 * 1024

def scan(data, socket_path):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as conn:
        conn.settimeout(15)
        conn.connect(socket_path)
        conn.sendall(b"zINSTREAM\0")
        for i in range(0, len(data), 65536):
            chunk = data[i:i+65536]
            conn.sendall(struct.pack("!I", len(chunk)) + chunk)
        conn.sendall(b"\0\0\0\0")
        response = bytearray()
        while b"\0" not in response and len(response) < 4096:
            part = conn.recv(1024)
            if not part:
                break
            response.extend(part)
        if b"\0" not in response:
            raise ValueError("incomplete scanner reply")
        reply = bytes(response).split(b"\0", 1)[0]
        if reply == b"stream: OK":
            return "clean"
        if reply.startswith(b"stream: ") and reply.endswith(b" FOUND"):
            return "infected"
        raise ValueError("unknown scanner reply")

class Handler(BaseHTTPRequestHandler):
    timeout = 20
    def log_message(self, *args):
        pass  # No tokens, request paths or file data in service logs.
    def respond(self, code, body):
        payload = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
    def do_POST(self):
        if self.path != "/scan":
            return self.respond(404, {"error":"not_found"})
        if not hmac.compare_digest(self.headers.get("Authorization","").encode(), self.server.auth):
            return self.respond(401, {"error":"unauthorized"})
        if self.headers.get("Transfer-Encoding") or len(self.headers.get_all("Content-Length", [])) != 1:
            return self.respond(400, {"error":"length"})
        try:
            length = int(self.headers["Content-Length"])
        except (ValueError, TypeError):
            return self.respond(400, {"error":"length"})
        if not 0 < length <= MAX_BYTES:
            return self.respond(413, {"error":"size"})
        try:
            data = self.rfile.read(length)
            digest = hashlib.sha256(data).hexdigest()
            if len(data) != length or not hmac.compare_digest(digest, self.headers.get("X-Content-SHA256","")):
                return self.respond(400, {"error":"integrity"})
            status = scan(data, self.server.clamd_socket)
            return self.respond(200, {"engine":"ClamAV","status":status,"sha256":digest})
        except (OSError, ValueError):
            return self.respond(503, {"error":"scanner_unavailable"})

def main():
    secret = os.environ["PRIVATE_AV_SCAN_TOKEN"]
    if len(secret) < 32:
        raise SystemExit("Configure a strong secret through the service environment")
    server = HTTPServer(("127.0.0.1", 8765), Handler)
    server.auth = ("Bearer " + secret).encode()
    server.clamd_socket = os.environ.get("CLAMD_SOCKET", "/run/clamav/clamd.ctl")
    server.serve_forever()

if __name__ == "__main__":
    main()
