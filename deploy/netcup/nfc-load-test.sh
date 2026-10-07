#!/usr/bin/env bash
# Run on the Netcup VPS from /var/www/reakton after deploy.
# Uses localhost:3010 — no public rate limits from nginx for this test.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/reakton}"
BASE="${BASE:-http://localhost:3010}"
TOTAL="${TOTAL:-150}"
CONCURRENCY="${CONCURRENCY:-30}"
CARDS_FILE="${CARDS_FILE:-}"

cd "${APP_DIR}"

echo "==> NFC load test (REAKTON)"
echo "    Base: ${BASE} · Total: ${TOTAL} · Concurrency: ${CONCURRENCY}"

ARGS=(--base "${BASE}" --total "${TOTAL}" --concurrency "${CONCURRENCY}")
if [[ -n "${CARDS_FILE}" && -f "${CARDS_FILE}" ]]; then
  ARGS+=(--cards-file "${CARDS_FILE}")
  echo "    Cards: ${CARDS_FILE}"
else
  ARGS+=(--from-content)
  echo "    Cards: from data/site-content*.json (nfcAlbum.cards)"
fi

node scripts/nfc-load-test.mjs "${ARGS[@]}"
EC=$?

if command -v jq >/dev/null 2>&1 && [[ -f data/nfc-sessions.json ]]; then
  ACTIVE=$(node -e "
    const fs=require('fs');
    const j=JSON.parse(fs.readFileSync('data/nfc-sessions.json','utf8'));
    const now=Date.now();
    console.log(Object.values(j.sessions||{}).filter(s=>s.expiresAt>now).length);
  ")
  echo "==> Aktive Sessions in data/nfc-sessions.json: ${ACTIVE}"
fi

echo "==> PM2 memory:"
pm2 jlist 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);const a=j.find(x=>x.name==='reakton');if(a)console.log('reakton',Math.round((a.monit?.memory||0)/1048576)+' MB CPU',a.monit?.cpu);}catch{}});" || true

exit "${EC}"
