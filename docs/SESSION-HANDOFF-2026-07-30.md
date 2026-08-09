# REAKTON WEBSITE 2026 — Zwischenstand (30.07.2026)

## Repo & Update (Windows)

```powershell
cd C:\Users\adria\REAKTON
git fetch https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour.git reakton-main
git reset --hard FETCH_HEAD
git push -f origin HEAD:main
```

- **GitHub (REAKTON):** https://github.com/AdrianoDebatefy/REAKTON  
- **Staging-Branch:** `reakton-main` auf `debatyfyOnlinebetaFour` (Bot-Push auf REAKTON direkt oft 403)

## Erledigt (Stand dieser Session)

### Landing & Welten
- Drei Welten mit Cover-Slots, MP4/Audio/YouTube pro Cover, Info-Sidepanel (DE/EN/JP)
- Welt-Soundloop (MP3) statt Hintergrund-MP4 auf Weltebene
- Spalten-Overlays und schwarzer Bottom-Scrim: weiches Aus-/Einblenden bei Welt-Eintritt und Rückbau
- Locale-Wechsel auf Home ohne Remount (kein erneutes Cover-Intro)
- «Willkommen bei» / welcome to / ようこそ lokalisiert

### Admin (`/admin`)
- Tabs: Content, Header, Live, Presse, **Kontakt**, Analytics, **Zugang**
- Kontakt: Nachrichten aus `data/messages/*.json` lesen & löschen
- Passwort: Tab Zugang → `data/admin.local.json` (Fallback über Code/`ADMIN_PASSWORD`)

### Weitere Seiten
- Live (YouTube-Liste), Presse (Links + JPG), Kontaktformular, Impressum/Datenschutz

### Daten (lokal, gitignored)
| Datei | Inhalt |
|-------|--------|
| `data/site-content.local.json` | CMS-Inhalte |
| `data/admin.local.json` | Admin-Passwort-Hash |
| `data/messages/*.json` | Kontaktanfragen |
| `data/analytics.json` | Pageviews |
| `public/uploads/` | Uploads |

## Offen

1. **Mobile Feinschliff** — Basis-Version eingebaut (siehe unten); ggf. Animationen Landing-Eintritt, Tablet-Breakpoint
2. **TOY (Clap-Toy)** — Header + Footer verlinken `clapToyUrl`; Einbindung als Embed oder Route

## Mobile (Stand Aug 2026)

- Erkennung: Viewport ≤767px (`useIsMobile`, gleich wie Tailwind `md`)
- **Landing:** gestapelte Welt-Karten (42vh), schneller Eintritt (~420ms), Scrim pro Karte
- **Welt:** Mobile-Hintergrund (9:16), kompakter Header, `MobileAlbumSlotScene` (2-Spalten-Grid → Cover-Detail)
- **Zurück:** direkt zur Landing ohne Desktop-Spalten-Rückbau
- Header: kompakteres Menu, Safe Areas (`viewport-fit=cover`)

## Empfohlene Reihenfolge (bei Rückkehr)

| Schritt | Was | Warum |
|--------|-----|--------|
| **1** | **TOY einbauen** (du programmierst parallel) | Kleiner, klarer Scope; `clapToyUrl` + UI sind vorbereitet. Sobald URL/Embed steht: Header, Footer, optional `/toy` oder Vollbild-Embed. |
| **2** | **Mobile verfeinern** | Größerer Block (Cover-Layout, Touch, Safe Areas, Performance). Toy-Form factor (Link vs. eingebettet) ist dann bekannt. |
| **3** | **Installation / Go-Live** | Env: `ADMIN_SECRET`, optional `ADMIN_PASSWORD`; persistentes `data/` auf dem Host; Domain. |

**Alternative:** Wenn Toy später kommt → zuerst Mobile + Go-Live mit externem Toy-Link, Toy-Embed nachziehen.

## Quick Start lokal

```bash
npm install
npm run dev
```

- Site: http://localhost:3000  
- Admin: http://localhost:3000/admin  

## Nächster Agent-Task (Kurz)

- TOY: `clapToyUrl` oder Embed in `WorldColumns` / neue Route; Admin-Feld falls nötig
- Mobile: `WorldView`, `AlbumSlotScene`, `WorldColumns` — Breakpoints, Touch, Höhen
- Deploy: Hosting mit persistentem `data/`, README Environment
