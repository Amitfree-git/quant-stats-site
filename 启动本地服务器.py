#!/usr/bin/env python3
from __future__ import annotations

import os
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        print(format % args)

server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
port = server.server_address[1]
url = f"http://127.0.0.1:{port}/index.html#/home"
print(f"量化统计学交互学习网站已启动：{url}")
print("关闭此终端窗口或按 Control-C 即可停止服务器。")
threading.Timer(0.7, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
