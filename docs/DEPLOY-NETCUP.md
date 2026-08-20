# REAKTON auf Netcup VPS installieren

**Ziel:** `reakton.de` auf dem VPS `v2202512327578422024` (neben 2 bestehenden Seiten)  
**Branch:** `cursor/club-robot-admin-d206` (Club 3D Roboter + Admin-Konfiguration)  
**Build-Label nach Deploy:** `club-robot-admin-2026-08-20`

---

## Wichtig: Bilder liegen bei dir lokal, nicht auf GitHub

Die Dateien unter `C:\Users\adria\REAKTON\public\worlds\` sind **korrekt** — sie werden absichtlich **nicht** ins Git-Repo committed (`public/worlds/README.txt`). Beim Deploy musst du sie **zusätzlich** auf den Server kopieren (siehe Schritt 4).

Gleiches gilt für:
- `public\og\` (Social-Preview-Bilder)
- `public\brand\reakton-logo.webp`
- `public\uploads\` (falls vorhanden)
- `public\worlds\reakton_hires_Robot_Modell.glb` (Club 3D Roboter)

---

## Übersicht

| Schritt | Wo | Was |
|--------|-----|-----|
| 1 | VPS (SSH) | Node.js, PM2, Verzeichnis anlegen |
| 2 | VPS | Repo klonen, `.env` anlegen, bauen |
| 3 | VPS | PM2 starten (Port **3010**) |
| 4 | Windows | Bilder & Uploads per SCP hochladen |
| 5 | VPS | Nginx vHost für `reakton.de` |
| 6 | VPS | SSL mit Certbot |
| 7 | Browser | Testen |

---

## Domain bei HostEurope, Hosting auf Netcup

Die **Domain** `reakton.de` / `www.reakton.de` bleibt bei **HostEurope** — du kündigst nur den **Webspace**, nicht die Domain.

### Reihenfolge (empfohlen)

1. **Jetzt:** Seite auf Netcup installieren und testen (per VPS-IP oder hosts-Datei)
2. **Wenn alles läuft:** DNS bei HostEurope umstellen
3. **Danach:** SSL auf Netcup mit Certbot (oder DNS schon auf VPS, dann Certbot)

### DNS-Einträge bei HostEurope (später)

| Typ | Name | Wert |
|-----|------|------|
| **A** | `@` (reakton.de) | IPv4-Adresse deines Netcup VPS |
| **A** | `www` | dieselbe IPv4-Adresse **oder** CNAME `www` → `reakton.de` |
| **AAAA** | `@` / `www` | optional IPv6 vom Netcup, falls aktiv |

**Entfernen / nicht mehr nutzen:** alte A- oder CNAME-Einträge, die auf den HostEurope-Webspace zeigen.

**TTL** vor der Umstellung auf 300–600 Sekunden senken, dann nach stabilem Betrieb wieder erhöhen.

### Vor dem Install: VPS prüfen

```bash
ssh root@DEINE-VPS-IP
# Repo kurz klonen oder nur Skript kopieren, dann:
bash deploy/netcup/preflight-check.sh
```

Das Skript zeigt Speicher, RAM, Load, belegte Ports und bestehende Nginx-Sites.

---

```bash
ssh root@DEINE-VPS-IP
# oder: ssh root@v2202512327578422024 (falls als Hostname konfiguriert)

node -v    # sollte v20+ sein
npm -v
pm2 -v     # falls nicht: npm install -g pm2

mkdir -p /var/www/reakton
mkdir -p /var/www/reakton/data
mkdir -p /var/www/reakton/public/uploads
chown -R www-data:www-data /var/www/reakton   # oder dein Deploy-User
```

Falls Node fehlt (Ubuntu/Debian):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

---

## Schritt 2 — Code auf den Server

```bash
cd /var/www/reakton

# Erstinstallation
git clone https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour.git .
git checkout cursor/club-robot-admin-d206

# Spaetere Updates (auf dem VPS):
# BRANCH=cursor/club-robot-admin-d206 bash deploy/netcup/install.sh

npm ci
```

### `.env` anlegen

```bash
nano /var/www/reakton/.env
```

Inhalt (Werte selbst setzen — **niemals** ins Repo committen):

```env
ADMIN_PASSWORD=<starkes-passwort>
ADMIN_SECRET=<mind-32-zufaellige-zeichen>
PRESS_PREVIEW_SECRET=<weiteres-geheimnis>
NEXT_PUBLIC_SITE_URL=https://reakton.de
NODE_ENV=production
```

Geheimnisse erzeugen (auf dem VPS):

```bash
openssl rand -base64 32
```

### Build

```bash
cd /var/www/reakton
npm run build
```

**Nach manuellem `git pull`** (ohne erneutes GitHub-Passwort):

```bash
cd /var/www/reakton
SKIP_GIT=1 bash deploy/netcup/install.sh
# oder nur Build + Restart:
bash deploy/netcup/restart.sh
```

Diagnose bei Problemen:

```bash
bash deploy/netcup/diagnose.sh
pm2 logs reakton --lines 50
```

---

## Schritt 3 — PM2 (Port 3010)

Port **3010** um Kollision mit anderen Seiten zu vermeiden (anpassen falls belegt).

```bash
cd /var/www/reakton
pm2 start deploy/netcup/ecosystem.config.cjs
pm2 save
pm2 startup    # Anweisung ausführen, damit PM2 nach Reboot startet
```

Test lokal auf dem VPS:

```bash
curl -I http://localhost:3010
```

Wichtig: PM2 startet mit `-H localhost`. `curl http://127.0.0.1:3010` kann fehlschlagen, obwohl die App laeuft.

---

## Schritt 4 — Bilder von Windows hochladen

**Auf deinem PC** (PowerShell), Pfade anpassen:

```powershell
cd C:\Users\adria\REAKTON

$SERVER = "root@DEINE-VPS-IP"
$REMOTE = "/var/www/reakton/public"

# Welten-Hintergründe (liegen bei dir lokal!)
scp -r public\worlds\*.jpg "${SERVER}:${REMOTE}/worlds/"

# OG-Bilder für Social Media
scp -r public\og\*.jpg "${SERVER}:${REMOTE}/og/"

# Logo
scp public\brand\reakton-logo.webp "${SERVER}:${REMOTE}/brand/"

# Optional: Uploads & Press-Player Assets
# scp -r public\uploads\* "${SERVER}:/var/www/reakton/public/uploads/"
# scp -r public\press-player\* "${SERVER}:${REMOTE}/press-player/"
```

Oder alles auf einmal:

```powershell
scp -r public\worlds public\og public\brand\reakton-logo.webp "${SERVER}:/var/www/reakton/public/"
```

---

## Schritt 5 — Nginx

Neue Site (nicht die 2 bestehenden überschreiben):

```bash
cp /var/www/reakton/deploy/netcup/nginx-reakton.de.conf /etc/nginx/sites-available/reakton.de
ln -s /etc/nginx/sites-available/reakton.de /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

DNS: `reakton.de` und `www.reakton.de` → VPS-IP zeigen lassen.

---

## Schritt 6 — SSL (Let's Encrypt)

```bash
certbot --nginx -d reakton.de -d www.reakton.de
```

---

## Schritt 7 — Prüfen

1. https://reakton.de — Startseite, Welten mit Hintergrundbildern  
2. https://reakton.de/admin — Login, Tab **Club 3D**: Roboter aktivieren, Hintergrundfoto, Tuning  
   Footer: Build-Label `club-robot-admin-2026-08-20`  
3. https://reakton.de/robots.txt  
4. https://reakton.de/sitemap.xml  
5. https://reakton.de/press — Press-Player  
6. https://reakton.de/toy — Coming Soon  

Admin-Passwort nach erstem Login unter **Zugang** ändern.

**Nach Admin-Änderungen (Slots, Texte, Uploads):** kein `npm run build` nötig — Seite liest `data/site-content.local.json` live. Nur nach Code-Updates neu bauen.

---

## Updates deployen

```bash
cd /var/www/reakton
git fetch origin cursor/deploy-seo-ready-d206
git reset --hard origin/cursor/deploy-seo-ready-d206
npm ci
npm run build
pm2 restart reakton
```

Bilder nur erneut hochladen, wenn sich etwas unter `public/worlds` geändert hat.

---

## Troubleshooting

| Problem | Lösung |
|--------|--------|
| Welten ohne Hintergrund | `public/worlds/*.jpg` auf Server prüfen: `ls -la /var/www/reakton/public/worlds/` |
| Admin-Login geht nicht | `.env` mit `ADMIN_PASSWORD` / `ADMIN_SECRET` prüfen, `pm2 restart reakton` |
| 502 Bad Gateway | `pm2 status`, `curl -I http://localhost:3010`, `bash deploy/netcup/diagnose.sh` |
| 500 / 307 auf `/` oder `/press` | PM2: `-H localhost` (siehe `deploy/netcup/ecosystem.config.cjs`), Nginx upstream `localhost:3010` + `X-Forwarded-Port 443`, dann `git pull`, `npm run build`, `pm2 restart reakton`, `nginx -t && systemctl reload nginx` |
| Uploads verschwinden | Persistentes Volume — nicht auf serverless deployen |
| Port 3010 belegt | In `deploy/netcup/ecosystem.config.cjs` und nginx auf z. B. 3011 ändern |
