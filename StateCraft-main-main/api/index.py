"""
StateCraft Vercel Serverless Function Handler
Maps all /api/* HTTP requests to the existing StateCraft REST API backend.
"""

import os
import sys

# Add root directory to sys.path so server.py can be imported
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from server import StateCraftHandler

class handler(StateCraftHandler):
    """
    Vercel serverless function entrypoint.
    Inherits all route handling, security validation, and business logic from StateCraftHandler.
    """

    def _resolve_request_path(self):
        """
        When Vercel rewrites /api/* to /api/index.py, the original request path
        is provided in headers (x-matched-path, x-forwarded-uri, or x-original-url).
        We restore the path so that StateCraftHandler routes match identically to local execution.
        """
        matched = (
            self.headers.get("x-matched-path")
            or self.headers.get("x-forwarded-uri")
            or self.headers.get("x-original-url")
        )
        if matched and matched.startswith("/api"):
            # Preserve query parameters from original request if not already present
            if "?" in self.path and "?" not in matched:
                self.path = matched + "?" + self.path.split("?", 1)[1]
            else:
                self.path = matched

    def do_OPTIONS(self):
        self._resolve_request_path()
        super().do_OPTIONS()

    def do_GET(self):
        self._resolve_request_path()
        super().do_GET()

    def do_POST(self):
        self._resolve_request_path()
        super().do_POST()

    def do_PUT(self):
        self._resolve_request_path()
        super().do_PUT()

    def do_DELETE(self):
        self._resolve_request_path()
        super().do_DELETE()
