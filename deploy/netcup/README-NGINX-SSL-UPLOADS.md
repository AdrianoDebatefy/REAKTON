# NFC / MP3 langsam? — Nginx HTTPS und `/uploads/`

Wenn das NFC-Album auf dem Handy **Minuten** braucht (trotz schnellem LTE), liegt es fast immer daran:

**`https://reakton.de/uploads/…` geht durch Next.js (Node), nicht durch Nginx.**

- Port **80** in `nginx-reakton.de.conf` hat `location /uploads/` → schnell.
- Nach **Certbot** fehlt dieselbe `location` oft im **443**-Block → alle HTTPS-MP3s laufen über PM2 Port 3010 → sehr langsam.

## Prüfen (vom VPS oder PC)

```bash
# Echte Datei vom Server (nicht den Platzhalter „DEIN-TRACK“):
FILE=$(ls /var/www/reakton/public/uploads/*.mp3 2>/dev/null | head -1)
test -n "$FILE" || { echo "Keine MP3 in public/uploads"; exit 1; }
NAME=$(basename "$FILE")
echo "Test: /uploads/$NAME"
curl -sI "https://reakton.de/uploads/${NAME}" | head -15
echo "--- Download-Geschwindigkeit (sollte wenige Sekunden für ~5–10 MB sein) ---"
time curl -fsS -o /tmp/reakton-mp3-test.mp3 "https://reakton.de/uploads/${NAME}"
ls -lh /tmp/reakton-mp3-test.mp3
```

**Gut:** `HTTP/2 200`, `Accept-Ranges: bytes`, große `Content-Length`, Antwort in **unter 1 s** für Header.

**Schlecht:** lange Wartezeit, kein `Accept-Ranges`, oder Traffic fühlt sich wie „hängender“ Download an.

## Fix

1. Snippet installieren:

```bash
sudo cp /var/www/reakton/deploy/netcup/reakton-static-locations.conf /etc/nginx/snippets/reakton-static.conf
```

2. Nginx-Site bearbeiten (meist `/etc/nginx/sites-available/reakton.de`):

Im **`server { listen 443 ssl … }`** Block **vor** `location / { proxy_pass … }` einfügen:

```nginx
include /etc/nginx/snippets/reakton-static.conf;
```

Dasselbe `include` auch im **`listen 80`** Block verwenden (optional alte `location`-Duplikate entfernen).

3. Testen und neu laden:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

4. Erneut `curl -sI https://reakton.de/uploads/….mp3` — sollte jetzt schnell und mit Range-Support sein.

## Diagnose-Skript

```bash
bash /var/www/reakton/deploy/netcup/diagnose.sh
```

Abschnitt **Static MP3 (HTTPS)** beachten.
