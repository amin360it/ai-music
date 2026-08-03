#!/usr/bin/env bash
# Scan for MP3 files and regenerate songs.json (standalone JSON, no HTML changes).
# Works on GitHub Code Spaces, Linux/macOS, and Git Bash on Windows.
set -e
cd "$(dirname "$0")"

echo "Scanning for MP3 files..."

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is required but not installed." >&2
  echo "Install it: sudo apt-get update && sudo apt-get install -y nodejs" >&2
  exit 1
fi

node scan-songs.js
echo "Done. Refresh your browser to see new songs."
