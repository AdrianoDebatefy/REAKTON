#!/usr/bin/env bash
# Check every NFC album MP3 in site-content exists on disk.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/reakton}"
CONTENT="${APP_DIR}/data/site-content.local.json"
UPLOADS="${APP_DIR}/public/uploads"

if [[ ! -f "$CONTENT" ]]; then
  echo "Missing $CONTENT"
  exit 1
fi

echo "=== NFC MP3 on disk vs site-content ==="
missing=0
while IFS= read -r path; do
  file="${UPLOADS}/$(basename "$path")"
  if [[ -f "$file" ]]; then
    echo "OK  $path ($(du -h "$file" | cut -f1))"
  else
    echo "MISSING  $path  (expected: $file)"
    missing=$((missing + 1))
  fi
done < <(grep -oE '"/uploads/[^"]+\.mp3"' "$CONTENT" | tr -d '"')

if [[ "$missing" -gt 0 ]]; then
  echo ""
  echo "$missing file(s) missing — preload fails around first missing track."
  exit 1
fi

echo ""
echo "All referenced MP3 files present."
