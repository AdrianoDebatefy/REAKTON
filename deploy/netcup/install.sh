#!/usr/bin/env bash
# Server-seitiges Setup-Skript — auf dem Netcup VPS ausführen (als root oder Deploy-User)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/reakton}"
BRANCH="${BRANCH:-cursor/club-robot-admin-d206}"
REPO="${REPO:-https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour.git}"
PORT="${PORT:-3010}"

echo "==> REAKTON install/update in ${APP_DIR} (branch ${BRANCH})"

if [[ "${SKIP_GIT:-0}" != "1" ]]; then
  if [[ ! -d "${APP_DIR}/.git" ]]; then
    mkdir -p "${APP_DIR}"
    git clone --branch "${BRANCH}" "${REPO}" "${APP_DIR}"
  else
    cd "${APP_DIR}"
    git fetch origin "${BRANCH}"
    git checkout "${BRANCH}"
    git reset --hard "origin/${BRANCH}"
  fi
else
  echo "==> SKIP_GIT=1 — ueberspringe git fetch/checkout"
fi

cd "${APP_DIR}"

if [[ ! -f .env ]]; then
  echo ""
  echo "FEHLER: .env fehlt in ${APP_DIR}"
  echo "Kopiere .env.example nach .env und trage ADMIN_PASSWORD, ADMIN_SECRET ein."
  echo "Siehe docs/DEPLOY-NETCUP.md"
  exit 1
fi

mkdir -p data public/uploads public/worlds public/og public/brand

npm ci
npm run build

if pm2 describe reakton >/dev/null 2>&1; then
  pm2 restart reakton
else
  pm2 start deploy/netcup/ecosystem.config.cjs
  pm2 save
fi

if [[ -f deploy/netcup/reakton-static-locations.conf ]] && [[ -d /etc/nginx/snippets ]]; then
  cp deploy/netcup/reakton-static-locations.conf /etc/nginx/snippets/reakton-static.conf
  echo "==> Nginx snippet: /etc/nginx/snippets/reakton-static.conf"
  echo "    SSL-Block (443) muss 'include /etc/nginx/snippets/reakton-static.conf;' haben — siehe deploy/netcup/README-NGINX-SSL-UPLOADS.md"
fi

echo ""
echo "==> Fertig. App laeuft auf http://localhost:${PORT}"
echo "==> Test: curl -I http://localhost:${PORT}   (nicht 127.0.0.1)"
echo "==> Vergiss nicht: public/worlds und public/og von Windows hochladen (docs/DEPLOY-NETCUP.md Schritt 4)"
echo "==> Nginx: deploy/netcup/nginx-reakton.de.conf"
