#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
if ! command -v python3 >/dev/null 2>&1; then
  echo "未找到 python3。请直接双击 index.html，或先安装 Python 3。"
  read -r -p "按回车键关闭…"
  exit 1
fi
exec python3 "$DIR/启动本地服务器.py"
