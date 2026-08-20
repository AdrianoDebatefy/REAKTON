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

echo "curl 127.0.0.1:3010:"
curl -sI --max-time 5 http://127.0.0.1:3010 | head -3 || echo "  FAILED (normal if app binds -H localhost only)"
echo ""

echo "Last PM2 logs:"
pm2 logs reakton --lines 20 --nostream 2>/dev/null || true
