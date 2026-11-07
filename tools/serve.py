"""Local-only export server, with no-cache headers for safe iterative exports."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import socket
options = argparse.ArgumentParser()
options.add_argument('--port', type=int, default=8174)
options.add_argument('--log-requests', action='store_true')
config = options.parse_args()
build = Path(__file__).resolve().parents[1] / 'build'
class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def __init__(self, *arguments, **kwargs):
        super().__init__(*arguments, directory=str(build), **kwargs)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_GET(self):
        if self.path == '/favicon.ico':
            self.send_response(204); self.end_headers(); return
        super().do_GET()
    def log_message(self, *args):
        if config.log_requests:
            super().log_message(*args)
class Server(ThreadingHTTPServer):
    # A GDevelop export requests many independent runtime scripts at startup.
    request_queue_size = 128
    allow_reuse_address = False
    def server_bind(self):
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()
server = Server(('127.0.0.1', config.port), Handler)
print(f'Courtyard: http://localhost:{config.port} (Ctrl+C to stop)', flush=True)
server.serve_forever()
