"""Serve the Downhill Bike HTML5 export on loopback."""
from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
        else:
            super().do_GET()

    def log_message(self, format, *args):
        if len(args) < 2 or str(args[1]) not in ("200", "304"):
            super().log_message(format, *args)

class Server(ThreadingHTTPServer):
    # GDevelop loads many separate runtime scripts in one navigation.
    request_queue_size = 128

if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--port", default=8182, type=int)
    args = parser.parse_args()
    build = Path(__file__).resolve().parents[1] / "build"
    if not (build / "index.html").is_file():
        parser.error("export the game to build/ before starting the preview")
    with Server(("127.0.0.1", args.port), partial(Handler, directory=str(build))) as server:
        print(f"Downhill Bike: http://localhost:{args.port}/", flush=True)
        server.serve_forever()
