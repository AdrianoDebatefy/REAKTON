#!/usr/bin/env bash
# Check NFC album tracks from site-content exist on disk (not every MP3 in the JSON).
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/reakton}"
CONTENT="${APP_DIR}/data/site-content.local.json"
UPLOADS="${APP_DIR}/public/uploads"

if [[ ! -f "$CONTENT" ]]; then
  echo "Missing $CONTENT"
  exit 1
fi

echo "=== NFC album tracks (nfcAlbum.tracks only) ==="
missing=0
count=0

while IFS=$'\t' read -r path title; do
  count=$((count + 1))
  file="${UPLOADS}/$(basename "$path")"
  if [[ -f "$file" ]]; then
    echo "OK   ${count}. ${title:-?}  $path ($(du -h "$file" | cut -f1))"
  else
    echo "MISSING  ${count}. ${title:-?}  $path"
    missing=$((missing + 1))
  fi
done < <(
  node -e "
    const c = require('${CONTENT}');
    const tracks = c.nfcAlbum?.tracks ?? [];
    for (const t of tracks.sort((a,b) => (a.order??0) - (b.order??0))) {
      const url = (t.audioUrl || '').trim();
      if (!url) continue;
      console.log(url + '\t' + (t.title || '').replace(/\t/g, ' '));
    }
  "
)

if [[ "$count" -eq 0 ]]; then
  echo "No tracks in nfcAlbum.tracks."
  exit 1
fi

echo "---"
if [[ "$missing" -eq 0 ]]; then
  echo "All $count NFC track file(s) present."
else
  echo "$missing of $count NFC file(s) missing — preload fails at first missing track."
  exit 1
fi
