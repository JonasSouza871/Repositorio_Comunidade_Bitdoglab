"""
BitDogLab WebSerial - Servidor HTTP
"""
import http.server
import socketserver
import os

PORT = 8000
HOST = "127.0.0.1"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.ThreadingTCPServer((HOST, PORT), MyHTTPRequestHandler) as httpd:
    print(f"Servidor rodando em http://{HOST}:{PORT}")
    print("Pressione Ctrl+C para parar")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
