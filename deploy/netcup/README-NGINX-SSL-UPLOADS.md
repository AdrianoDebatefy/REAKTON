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

## NFC-Scan 404 nach Static-Snippet

Wenn `location /nfc/` auf `public/nfc/` zeigt, fängt Nginx **`/nfc/tap`** ab (NFC-URL der Karte) — Next.js kommt nie dran → **404**.

**Fix:** Im Snippet nur **`/nfc/player-v2/`** statisch ausliefern (siehe `reakton-static-locations.conf`). Danach:

```bash
sudo cp /var/www/reakton/deploy/netcup/reakton-static-locations.conf /etc/nginx/snippets/reakton-static.conf
sudo nginx -t && sudo systemctl reload nginx
curl -sI "https://reakton.de/nfc/tap?card=test" | head -3   # 400 oder 302, nicht 404
```

## Häufiger Fehler: `duplicate location "/uploads/"`

Pro `server { }` Block **entweder** `include …reakton-static.conf` **oder** manuelle `location /uploads/` — **nicht beides**.

## Fix

1. Snippet installieren:

```bash
sudo cp /var/www/reakton/deploy/netcup/reakton-static-locations.conf /etc/nginx/snippets/reakton-static.conf
```

2. Nginx-Site bearbeiten (`/etc/nginx/sites-enabled/reakton.de`):

In **jedem** `server { }`, der die Seite ausliefert (mindestens **`listen 443 ssl`** und **`listen 80`**), **vor** `location / { proxy_pass … }` einfügen:

Prüfen:

```bash
sudo grep -n "server {\|listen \|reakton-static\|location /uploads" /etc/nginx/sites-enabled/reakton.de
```

Es muss **pro aktivem Server-Block genau ein** `include …reakton-static.conf` geben, **kein** zusätzliches `location /uploads/`.

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
