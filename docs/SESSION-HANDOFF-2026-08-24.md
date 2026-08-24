# REAKTON — Session-Handoff (24.08.2026)

Stand nach Session-Ende (User: „danke das wars für heute“).

## Produktion / VPS (reakton.de)

| Was | Wert |
|-----|------|
| **Deploy-Branch (aktuell)** | `cursor/club-robot-https-d206` |
| **Build-Label (Admin-Footer)** | `link-button-font-400pct-2026-08-24` |
| **Repo (Agent-Push)** | `https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour.git` |
| **User-Repo** | `https://github.com/AdrianoDebatefy/REAKTON.git` |
| **VPS-Pfad** | `/var/www/reakton` |
| **PM2-Port** | `3010` (nginx → HTTPS) |
| **Deploy-Befehl** | `BRANCH=cursor/club-robot-https-d206 bash deploy/netcup/install.sh` |

### HTTPS / Startseite (verifiziert)

```bash
curl -sIL https://reakton.de/ | grep -iE 'HTTP/|location:' | head -4
# → 307 location: https://reakton.de/de
# → 200 OK
```

- `localePrefix: "always"` — Startseite DE unter `/de` (nicht `/`)
- Keine Redirect-Schleife, kein `:3010` in öffentlichen URLs

---

## Branch-Übersicht (wichtig für nächste Session)

| Branch | Status | Inhalt |
|--------|--------|--------|
| **`cursor/club-robot-https-d206`** | **→ PRODUKTIV deployen** | Club-Roboter + HTTPS + Locale-Fix + Link-Button + 400%-Schrift |
| `cursor/world-link-button-d206` | in obigen Branch gemerged | Ursprünglicher Link-Button-Branch (nicht separat deployen) |
| `cursor/fix-https-redirect-d206` | in club-robot-https integriert | HTTPS-Redirect-Fixes (PR #13) |
| `cursor/club-robot-admin-d206` | Basis für Roboter | Vorgänger ohne HTTPS/Locale/Link-Button |
| `cursor/deploy-seo-ready-d206` | veraltet | Alter Deploy-Stand |
| `reakton-main` | Base für PRs | GitHub default base |

### Letzte Commits auf `cursor/club-robot-https-d206`

```
0c27d2a Increase link button label font size to 400%
397c930 Merge per-world link button into club-robot-https branch
9e88878 Fix locale URLs like /de/en when switching language
cca1e3b Switch locale on homepage without full page reload
821e85a Restore club robot and fix Japanese locale switching
```

### Pull Requests (debatyfyOnlinebetaFour)

- **PR #14** — `cursor/club-robot-https-d206` (Haupt-PR, alles kombiniert)
- PR #13 — HTTPS redirect fix (historisch)
- PR #12 — Link button only (historisch, jetzt in #14)

---

## Was heute implementiert / gefixt wurde

### 1. Link-Button pro Welt (600×100 px)
- Admin: **Content → Welt → Link-Button**
- Felder: ON/OFF, Position X/Y (1920×1080 Canvas), URL, Hintergrundfarbe, Label DE/EN/JP
- Anzeige: Desktop in `WorldView` via `WorldLinkButtonOverlay`
- Schrift: **400 %** (56px / 64px) — Commit `0c27d2a`

### 2. Club 3D Roboter
- Admin-Tab **Club 3D** (GLB, Hintergrund, Tuning)
- `/api/world-asset/[...path]` für GLB auf Production
- `club-layout.json` — Cover links/rechts um Roboter

### 3. HTTPS / „Nicht sicher“
- Zertifikat war immer gültig (Let's Encrypt bis Nov 2026)
- Problem: Middleware-Redirects (HTTP, dann `:3010`, dann Schleife)
- Fix: `localePrefix: "always"` + `sanitizeProxyHeaders` + `toPublicRedirectUrl`

### 4. Sprachumschaltung DE / EN / JP
- Startseite: **clientseitig** (`switchLocaleClient`) — keine Animation-Neustarts
- Fix für falsche URLs wie `/de/en` via `stripLocaleFromPathname()`
- Japanisch: `https://reakton.de/ja` — 200 OK

---

## Wichtige Dateien

| Feature | Dateien |
|---------|---------|
| Link-Button | `src/lib/world-link-button.ts`, `WorldLinkButtonEditor.tsx`, `WorldLinkButtonOverlay.tsx` |
| Locale-Pfade | `src/lib/locale-path.ts`, `ClientIntlShell.tsx`, `Header.tsx` |
| Middleware | `src/middleware.ts`, `src/i18n/routing.ts` (`localePrefix: "always"`) |
| Club-Roboter | `src/lib/club-robot.ts`, `src/components/worlds/club/*`, `ClubRobotAdminEditor.tsx` |
| Build-Label | `src/lib/site-build.ts` |

---

## Deploy-Workflow (VPS)

```bash
cd /var/www/reakton
BRANCH=cursor/club-robot-https-d206 bash deploy/netcup/install.sh
```

Git auf dem Server: Skript nutzt `git fetch` + `git reset --hard origin/<branch>` (kein `git pull` nötig).

Windows-Assets (GLB, worlds, og):

```powershell
.\deploy\netcup\upload-assets-from-windows.ps1 -Server ray@152.53.135.104
```

---

## Bekannte Einschränkungen / offene Punkte

1. **Deutsche URL** ist `/de` nicht `/` (wegen HTTPS-Fix) — bewusst so
2. **Link-Button** nur Desktop (`hidden md:block`)
3. **Unterseiten** (`/press`, …): Sprachwechsel via `router.replace` (kurzer Reload OK)
4. Branch `cursor/world-link-button-d206` nicht mehr separat nötig — alles in `club-robot-https-d206`

---

## Nächste Session — empfohlener Start

```bash
git fetch origin cursor/club-robot-https-d206
git checkout cursor/club-robot-https-d206
```

Dann Admin-Footer prüfen: `link-button-font-400pct-2026-08-24`
