#!/bin/bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_TARGET="/Users/amitfree/Documents/Obsidian/Amt知识库/AI量化投资学习手册/02-量化统计学基础/_交互网站"
TARGET="${1:-$DEFAULT_TARGET}"
CUSTOM_TARGET="${1:-}"

if [[ "$SOURCE_DIR" == "$TARGET" ]]; then
  echo "网站已经位于目标目录。"
  open "$TARGET/index.html" 2>/dev/null || true
  exit 0
fi

PARENT="$(dirname "$TARGET")"
if [[ -n "$CUSTOM_TARGET" ]]; then
  BACKUP_ROOT="$(dirname "$TARGET")/_课程安装备份"
else
  BACKUP_ROOT="/Users/amitfree/Documents/Obsidian/Amt知识库/_课程安装备份"
fi
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
mkdir -p "$PARENT"

if [[ -d "$TARGET" ]] && [[ -n "$(find "$TARGET" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
  mkdir -p "$BACKUP_ROOT"
  BACKUP="$BACKUP_ROOT/量化统计学交互网站_$TIMESTAMP"
  echo "正在备份现有网站到：$BACKUP"
  if command -v ditto >/dev/null 2>&1; then
    ditto "$TARGET" "$BACKUP"
  else
    mkdir -p "$BACKUP"
    cp -a "$TARGET"/. "$BACKUP"/
  fi
fi

rm -rf "$TARGET"
mkdir -p "$TARGET"
if command -v ditto >/dev/null 2>&1; then
  ditto "$SOURCE_DIR" "$TARGET"
else
  cp -a "$SOURCE_DIR"/. "$TARGET"/
fi

chmod +x "$TARGET"/*.command "$TARGET/启动本地服务器.py" 2>/dev/null || true

echo "安装完成：$TARGET"
echo "网站入口：$TARGET/index.html"
open "$TARGET/index.html" 2>/dev/null || true
