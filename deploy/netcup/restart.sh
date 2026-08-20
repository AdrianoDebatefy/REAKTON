#!/usr/bin/env bash
# Build + PM2 restart — no git fetch (run after manual git pull)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/reakton}"
cd "${APP_DIR}"

if [[ ! -f .env ]]; then
  echo "FEHLER: .env fehlt in ${APP_DIR}"
  exit 1
fi

mkdir -p data public/uploads public/worlds public/og public/brand

echo "==> npm ci"
npm ci

echo "==> npm run build"
npm run build

echo "==> pm2 restart"
if pm2 describe reakton >/dev/null 2>&1; then
  pm2 restart reakton
else
  pm2 start deploy/netcup/ecosystem.config.cjs
  pm2 save
fi

echo ""
echo "==> Port check (use localhost, not 127.0.0.1)"
ss -tlnp | grep 3010 || true
curl -sI http://localhost:3010 | head -5 || true
pm2 status
