# Presse-Preview: Zugangscodes (Admin)

Album-Preview für Journalisten unter **`/press`** bzw. **`/press/player/[slug]`** (z. B. WEM, MMN, CCC). Login mit **E-Mail + Passwort**; Tracks und Bewertungen werden im Admin verwaltet (Tab **Presse** → Bereich **Album Preview Player**).

Stand: mehrere **parallele** Presse-Passwörter mit **jeweils eigener Laufzeit** (seit Merge PR #2, Branch `cursor/multi-press-access-codes-0e28`).

---

## Verhalten (Kurz)

| Thema | Verhalten |
|--------|-----------|
| **Anzahl aktiver Codes** | Beliebig viele gleichzeitig; jede Generierung **fügt hinzu**, ersetzt nicht |
| **Laufzeit** | Pro neuem Code: **1–365 Tage** (Feld „Laufzeit für neues Passwort (Tage)“ im Admin) |
| **Ablauf** | Code funktioniert bis `expiresAt`; danach nur noch in der Admin-Liste als „abgelaufen“ |
| **Sperren / Widerruf** | Nicht vorgesehen — Codes laufen natürlich aus |
| **Gleichzeitige Nutzer** | Unbegrenzt; alle können dasselbe oder verschiedene Codes nutzen |
| **Session nach Login** | Cookie/JWT ca. **30 Tage** (unabhängig vom Passwort-Ablauf) |
| **Klartext-Passwort** | Nur **einmal** direkt nach „Weiteres Passwort erzeugen“ im Admin sichtbar |

---

## Admin (reakton.de)

1. **`/admin`** → Tab **Presse** (bzw. Inhalt mit **Album Preview Player**).
2. **Presse-Zugang**
   - **Laufzeit für neues Passwort (Tage)** — gilt nur für den **nächsten** erzeugten Code.
   - **Weiteres Passwort erzeugen** — neuer Zufalls-Code (14 Zeichen); bestehende Codes bleiben gültig.
3. Liste: Erstellungsdatum, Laufzeit, „gültig bis“ / „abgelaufen“.
4. **Zugriffslog** (letzte Anmeldungen): E-Mail, Welt, Zeitstempel.

Preview-Tracks pro Welt (Cosmos / Nano / Club) im selben Bereich pflegen.

---

## Server (Netcup VPS)

| Pfad | Inhalt |
|------|--------|
| `/var/www/reakton/data/press-preview.local.json` | Passwort-Hashes + Ablaufdaten (gitignored) |
| `/var/www/reakton/data/press-access-log.json` | Anmelde-Log |
| `/var/www/reakton/data/press-votes.json` | Bewertungen (falls genutzt) |

**Wichtig:** `data/` liegt nur auf dem VPS — bei Deploy **nicht** löschen. Code-Updates (`git pull`, `npm run build`, `pm2 restart`) ändern diese Dateien nicht.

### Dateiformat

- **Aktuell:** `version: 2` mit Array `accesses[]` (je Eintrag: `id`, `passwordHash`, `expiresAt`, `expiryDays`, `createdAt`).
- **Migration:** Beim ersten Lesen nach dem Update wird das alte **Einzel-Passwort-Format** automatisch in `version: 2` überführt — **Hash und Ablaufdatum bleiben gleich** (verschickte Codes bleiben gültig).

Metadaten prüfen (ohne Passwort):

```bash
cd /var/www/reakton
node -e "
const j=require('./data/press-preview.local.json');
if(j.version===2){
  console.log('Format: v2, Codes:', j.accesses.length);
  j.accesses.forEach((a,i)=>console.log(i+1,'ablauf',a.expiresAt,'tage',a.expiryDays,'erstellt',a.createdAt));
}else{
  console.log('Format: alt (ein Code), ablauf', j.expiresAt,'tage',j.expiryDays,'erstellt',j.createdAt);
}
"
```

Vor größeren Deploys optional Backup:

```bash
cd /var/www/reakton
cp -a data/press-preview.local.json \
  "data/press-preview.local.json.bak-$(date +%Y%m%d-%H%M)"
```

---

## Deploy (Presse-Feature mitziehen)

Standard-Update auf dem VPS:

```bash
cd /var/www/reakton
REPO=https://github.com/AdrianoDebatefy/REAKTON.git \
BRANCH=main \
bash deploy/netcup/install.sh
```

Nach Deploy: Admin hart neu laden (Strg+F5). Erwartung: Button **„Weiteres Passwort erzeugen“** und Code-Liste.

Commit mit Presse-Multi-Code (Referenz): Merge PR #2 → z. B. `76ac9fb`.

---

## Typische Abläufe

**Neue Redaktion, alter Code soll weiterlaufen**

1. Feature-Stand auf dem Server (siehe oben).
2. Laufzeit für den **neuen** Code einstellen (z. B. 14 Tage).
3. **Weiteres Passwort erzeugen** — nur den **neuen** Code weitergeben.

**Code läuft morgen ab, Presse braucht länger**

- Zusätzlichen Code mit längerer Laufzeit erzeugen (nicht den alten Code „verlängern“ — jeder Eintrag hat festes `expiresAt`).
- Presse kann mit neuem Code erneut einloggen; alte Session kann bis 30 Tage weiterlaufen.

**Presse meldet „abgelaufen“**

- Admin-Liste: Eintrag wirklich abgelaufen?
- `press-preview.local.json` auf dem VPS vorhanden?
- `pm2 restart reakton` nach `.env`-Änderungen an `PRESS_PREVIEW_SECRET` / `ADMIN_SECRET`.

---

## Umgebungsvariablen (optional)

Presse-Session nutzt JWT mit:

- `PRESS_PREVIEW_SECRET` (bevorzugt), sonst `ADMIN_SECRET`

Siehe `.env.example` / `docs/DEPLOY-NETCUP.md`.

---

## Siehe auch

- `docs/DEPLOY-NETCUP.md` — VPS, PM2, Nginx
- `src/lib/press-preview-credentials.ts` — Implementierung
