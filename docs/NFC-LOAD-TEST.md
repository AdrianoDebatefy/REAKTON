# NFC Lasttest (VPS)

Ziel: Prüfen, ob der Server **viele gleichzeitige NFC-Taps** (verschiedene Karten) verkraftet — relevant ab ~100+ verkauften Tags.

## Vorbereitung auf dem Server

1. Code aktualisieren (`main` + `bash deploy/netcup/restart.sh`).
2. **Test-Karten** müssen in der Site-Config existieren (Admin → NFC → Bulk oder `--cards-file`).
3. Optional: Karten-IDs aus Bulk-CSV (Spalte **Karten-ID**) in eine Textdatei kopieren, z. B. `/var/www/reakton/data/nfc-loadtest-cards.txt`.

## Test auf dem VPS (empfohlen)

```bash
cd /var/www/reakton
chmod +x deploy/netcup/nfc-load-test.sh

# Standard: 150 Taps, 30 parallel, Karten aus site-content
bash deploy/netcup/nfc-load-test.sh

# Strenger
TOTAL=300 CONCURRENCY=50 bash deploy/netcup/nfc-load-test.sh

# Mit eigener ID-Liste (Production-Bulk)
CARDS_FILE=/var/www/reakton/data/nfc-loadtest-cards.txt TOTAL=200 CONCURRENCY=40 bash deploy/netcup/nfc-load-test.sh
```

Erfolg = fast alle Antworten **HTTP 302** (Redirect zum Player). Ausgabe enthält **p50/p95/p99** Latenz und Taps/s.

## Von deinem Rechner (öffentliche URL)

Nur mit Vorsicht — belastet die Live-Site:

```bash
node scripts/nfc-load-test.mjs --base https://reakton.de --cards-file ./karten-ids.txt --total 50 --concurrency 10
```

## Was wir technisch abgesichert haben

- **Datei-Lock** auf `data/nfc-sessions.json` und `nfc-tap-stats.json` (parallele Taps überschreiben sich nicht mehr).
- **PC-Codes:** **3 Wörter à 4 Buchstaben** (CI: `CLIP:CLAP:CLUB`), großer Pool (~64³ Kombinationen).

## `fetch failed` / 0 Erfolge

Das bedeutet: **Keine Verbindung zu Next.js** (nicht „Karte ungültig“).

1. **Nach `pm2 restart` 5–10 Sekunden warten**, dann Test erneut.
2. Prüfen:
   ```bash
   curl -sI http://localhost:3010/ | head -3
   ss -tlnp | grep 3010
   pm2 status
   pm2 logs reakton --lines 40 --nostream
   ```
3. Viele PM2-Restarts (↺) → App stürzt ab, Logs lesen (`.env`, Speicher, Build).
4. Node **v18+** für das Skript: `node -v`
5. Falls nötig: `BASE=http://127.0.0.1:3010 bash deploy/netcup/nfc-load-test.sh`
6. PM2 muss **`fork`** sein (nicht `cluster`): `pm2 delete reakton && pm2 start deploy/netcup/ecosystem.config.cjs && pm2 save`

### Log-Zeilen (oft harmlos)

- **`Server Reference ID did not match`** — Bots scannen Server Actions (POST-Müll), kein REAKTON-Bug.
- **`ENVIRONMENT_FALLBACK`** — next-intl ohne Request-Kontext; NFC-Play-Seite ist auf `force-dynamic` gestellt (Update pullen + neu bauen).

## Wann nachjustieren?

| Symptom | Maßnahme |
|--------|----------|
| viele Fehler &gt; 5 % | Concurrency senken, VPS-RAM/CPU prüfen (`pm2 monit`) |
| p95 &gt; 2–3 s | Nginx/Node-Logs, ggf. PM2 `max_memory_restart` erhöhen |
| 100+ gleichzeitige **MP3-Streams** | Bandbreite/CDN für `/uploads/` — separater Test |

Bei Fragen: Ergebnis-Log des Skripts + `pm2 logs reakton --lines 50` sichern.
