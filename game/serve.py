#!/usr/bin/env python3
"""Arendusserver: nagu `python3 -m http.server`, aga keelab vahemälu,
et js/css muudatused jõuaksid alati kohe brauserisse."""
import http.server, sys, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8124

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()
