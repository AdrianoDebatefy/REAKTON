# REAKTON WEBSITE 2026 — Session-Handoff (07.10.2026)

Stand nach Abschluss: **NFC Admin (Bulk, Tabzähler, Skalierung, VPS-Lasttest)**.

## Repository & Produktion

| Was | Wert |
|-----|------|
| **Repo** | `https://github.com/AdrianoDebatefy/REAKTON` |
| **Branch Produktion** | `main` |
| **VPS** | Netcup, `/var/www/reakton`, User `ray` |
| **PM2** | `fork`, 1 Instanz, Port **3010**, `deploy/netcup/ecosystem.config.cjs` |
| **Deploy** | `git pull origin main` → `bash deploy/netcup/restart.sh` |

---

## Was umgesetzt wurde

### Admin → NFC

- **Tabs:** «NFC-Karten» | «Album-Tracks»
- **Bulk-Erstellung:** variable Anzahl, nur **append**, volle Links `https://reakton.de/nfc/tap?card=…`
- **Bulks persistiert** in `nfcAlbum.bulkBatches` (nach «Alles speichern»), **einklappbar**, Tabzähler pro Bulk + Export **Excel (XLSX)** und **CSV** (`;` für deutsches Excel)
- Kartenliste: **Tabzähler** statt Label, **Rolle** entfernt, volle URL + Kopieren
- **Tabzähler zurücksetzen** (Admin-Button, PR #10) → leert nur `data/nfc-tap-stats.json`

### Technik / Skalierung

- **File-Locks** (`proper-lockfile`) für `data/nfc-sessions.json` und `nfc-tap-stats.json`
- **PC-Codes:** 3 Wörter à **4 Buchstaben** (CI, z. B. `CLIP:CLAP:CLUB`), Pool ~64 Wörter
- **PM2 fork** (kein cluster) — wichtig für Next.js
- **`/nfc/play`:** `force-dynamic` + `setRequestLocale` (weniger `ENVIRONMENT_FALLBACK`)

### Lasttest (VPS, Okt 2026)

Skript: `deploy/netcup/nfc-load-test.sh` — Doku: **`docs/NFC-LOAD-TEST.md`**

| Lauf | Ergebnis |
|------|----------|
| 150 Taps / 30 parallel | 150/150, p95 ~772 ms |
| 300 Taps / 50 parallel | 300/300, p95 ~1,6 s |

Logs «Server Reference ID…» = **Bot-Scans**, unkritisch.

---

## Wichtige Dateien

| Pfad | Rolle |
|------|--------|
| `src/components/admin/NfcAlbumEditor.tsx` | NFC-Admin UI |
| `src/lib/nfc-album-sessions.ts` | Sessions, PC-Codes |
| `src/lib/nfc-tap-stats.ts` | Tabzähler |
| `src/lib/json-file-store.ts` | Locked JSON writes |
| `src/lib/nfc-bulk-export.ts` | Bulk CSV/XLSX Export |
| `scripts/nfc-load-test.mjs` | Lasttest |
| `data/site-content.local.json` | Live-Content auf VPS (nicht in Git) |
| `data/nfc-sessions.json` | Aktive NFC-Sessions |
| `data/nfc-tap-stats.json` | Tap-Statistik |

---

## Routine-Ops

**Backup:** Admin oben → «Backup exportieren» (JSON gesamter Content).

**Nach Bulk:** «Alles speichern» → **XLSX** oder CSV aus Bulk → GoToTags.

**Tabzähler nach Tests nullen:** Admin «Tabzähler zurücksetzen» oder VPS:

```bash
printf '%s\n' '{"byCardId":{}}' > /var/www/reakton/data/nfc-tap-stats.json
```

**PM2 neu sauber:**

```bash
pm2 delete reakton
pm2 start deploy/netcup/ecosystem.config.cjs
pm2 save
```

---

## Merged PRs dieser Session

#5 NFC Admin Bulk & Tabs · #6 XLSX/CSV Bulk-Export · #7 Session-Locks & Loadtest · #8 Loadtest-Wartezeit · #9 PM2 fork & intl · #10 Tabzähler-Reset
