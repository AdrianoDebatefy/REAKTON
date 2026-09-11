#!/usr/bin/env bash
# Prüft, ob /nfc/tap zu Next.js durchreicht (NFC-Karten-URL). Nginx-404 = Snippet kaputt.
set -euo pipefail

BASE="${BASE:-https://reakton.de}"
URL="${BASE}/nfc/tap?card=test"

echo "==> GET $URL"
headers=$(curl -sSI "$URL" | tr -d '\r')
status=$(echo "$headers" | head -1)
body=$(curl -sS "$URL" | head -c 200)

echo "$status"
if echo "$status" | grep -q '404'; then
  if echo "$body" | grep -qi '<title>404 Not Found</title>'; then
    echo ""
    echo "FEHLER: Nginx-404 — location /nfc/ blockiert vermutlich /nfc/tap."
    echo "Fix:"
    echo "  sudo cp /var/www/reakton/deploy/netcup/reakton-static-locations.conf /etc/nginx/snippets/reakton-static.conf"
    echo "  sudo nginx -t && sudo systemctl reload nginx"
    exit 1
  fi
fi

if echo "$status" | grep -qE '400|302'; then
  echo "OK: Next.js antwortet (400 ohne gültige Karte oder 302 Redirect)."
  exit 0
fi

echo "Unerwartet. Body-Anfang:"
echo "$body"
exit 1
