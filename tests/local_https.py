"""Serve the already-built public files on loopback TLS for browser tests only."""
import functools
import http.server
import ssl
import sys

if __name__ == "__main__":
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory="dist")
    with http.server.ThreadingHTTPServer(("127.0.0.1", 8765), handler) as server:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(sys.argv[1], sys.argv[2])
        server.socket = context.wrap_socket(server.socket, server_side=True)
        server.serve_forever()
