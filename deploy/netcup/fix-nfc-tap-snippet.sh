#!/usr/bin/env bash
# Ersetzt /etc/nginx/snippets/reakton-static.conf — behebt NFC-404 (location /nfc/ blockiert /nfc/tap).
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/reakton}"
SRC="${APP_DIR}/deploy/netcup/reakton-static-locations.conf"
DEST="/etc/nginx/snippets/reakton-static.conf"

if [[ ! -f "$SRC" ]]; then
  echo "FEHLER: $SRC fehlt. cd $APP_DIR && git pull."
  exit 1
fi

if grep -q 'location /nfc/ {' "$SRC" 2>/dev/null && ! grep -q 'location /nfc/player-v2/' "$SRC" 2>/dev/null; then
  echo "FEHLER: Repo-Snippet ist noch alt (location /nfc/). Branch cursor/nfc-player-v2-d206 pullen."
  exit 1
fi

echo "==> Aktuell auf dem Server:"
sudo grep -n 'location /nfc' "$DEST" 2>/dev/null || echo "(keine Datei)"

echo "==> Installiere $DEST"
sudo cp "$SRC" "$DEST"
sudo chmod 644 "$DEST"

echo "==> Nach dem Kopieren:"
sudo grep -n 'location /nfc' "$DEST"

if sudo grep -q 'location /nfc/ {' "$DEST"; then
  echo "FEHLER: Snippet enthält noch location /nfc/ — Abbruch."
  exit 1
fi

sudo nginx -t
sudo systemctl reload nginx

echo "==> Test https://reakton.de/nfc/tap"
if [[ -x "${APP_DIR}/deploy/netcup/verify-nfc-tap.sh" ]]; then
  BASE=https://reakton.de bash "${APP_DIR}/deploy/netcup/verify-nfc-tap.sh"
else
  curl -sI "https://reakton.de/nfc/tap?card=test" | head -1
fi
