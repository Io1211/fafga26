#!/usr/bin/env python3
"""
Entwicklungsserver für Hauspost.

    python3 serve.py          # http://localhost:8000

Warum nicht einfach `python3 -m http.server`? Weil Browser ES-Module
aggressiv zwischenspeichern. Nach einer Änderung an einer .js-Datei sieht
man dann weiter den alten Stand — inklusive Fehlermeldungen aus Zeilen,
die es nicht mehr gibt. Dieser Server schickt No-Cache-Header mit.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class OhneCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "200" not in (args[1] if len(args) > 1 else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Hauspost läuft auf http://localhost:{port}")
    print(f"  Produkt   http://localhost:{port}/")
    print(f"  Editor    http://localhost:{port}/foto-video-editor/foto-video-editor.html")
    print(f"  KI        http://localhost:{port}/dev/ki.html")
    ThreadingHTTPServer(("", port), OhneCache).serve_forever()
