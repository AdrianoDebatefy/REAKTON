#!/usr/bin/env bash
# Quick health check on the VPS
set -u

APP_DIR="${APP_DIR:-/var/www/reakton}"

echo "=== REAKTON diagnose ==="
echo "Dir: ${APP_DIR}"
echo ""

if [[ -d "${APP_DIR}/.git" ]]; then
  cd "${APP_DIR}"
  echo "Branch: $(git branch --show-current)"
  echo "Commit: $(git log -1 --oneline)"
  echo ""
fi

echo "PM2:"
pm2 status 2>/dev/null || echo "pm2 not found"
echo ""

echo "Port 3010 listeners:"
ss -tlnp 2>/dev/null | grep 3010 || echo "  (nothing on 3010)"
echo ""

echo "curl localhost:3010:"
curl -sI --max-time 5 http://localhost:3010 | head -8 || echo "  FAILED"
echo ""

echo "GLB via API (worlds):"
curl -sI --max-time 5 http://localhost:3010/api/world-asset/worlds/reakton_hires_Robot_Modell.glb | head -3 || true
echo "GLB via API (uploads sample):"
ls /var/www/reakton/public/uploads/*.glb 2>/dev/null | head -1 | while read -r f; do
  name=$(basename "$f")
  curl -sI --max-time 5 "http://localhost:3010/api/world-asset/uploads/$name" | head -3 || true
done
echo ""

echo "Last PM2 logs:"
pm2 logs reakton --lines 20 --nostream 2>/dev/null || true
echo ""

echo "=== Static MP3 (HTTPS) ==="
SAMPLE_MP3=$(ls "${APP_DIR}/public/uploads/"*.mp3 2>/dev/null | head -1)
if [[ -z "${SAMPLE_MP3}" ]]; then
  echo "  No .mp3 in public/uploads — skip"
else
  NAME=$(basename "${SAMPLE_MP3}")
  echo "Sample: /uploads/${NAME}"
  echo "HTTPS headers (should be fast; Accept-Ranges: bytes):"
  curl -sI --max-time 15 "https://reakton.de/uploads/${NAME}" 2>/dev/null | head -12 || echo "  curl failed"
  echo ""
  echo "If slow or missing Accept-Ranges: add include snippets/reakton-static.conf to SSL server block."
  echo "See deploy/netcup/README-NGINX-SSL-UPLOADS.md"
fi
