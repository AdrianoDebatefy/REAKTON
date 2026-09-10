# REAKTON — Session-Handoff (10.09.2026)

Stand nach Session-Ende (NFC Player v2, Gestell-Asset, Deploy-Flow).

## Repos & Deploy

| Was | Wert |
|-----|------|
| **Agent / VPS-Repo** | `https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour.git` |
| **Lokales User-Repo** | `https://github.com/AdrianoDebatefy/REAKTON.git` |
| **NFC v2 Branch** | `cursor/nfc-player-v2-d206` |
| **PR** | [#16](https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour/pull/16) (draft) |
| **Letzter Commit** | `e8caf93` — autoplay on open, CD spin when not paused, title at 350×530 |
| **Build-Label (Admin-Footer)** | `nfc-player-v2-autoplay-cd-2026-09-10` |
| **VPS Deploy** | `BRANCH=cursor/nfc-player-v2-d206 bash /var/www/reakton/deploy/netcup/install.sh` |

**Git lokal (Windows):** Remote `agent` / `beta` → debatyfyOnlinebetaFour; `origin` → REAKTON. NFC-Branch nur auf **agent** pushen für Produktion.

---

## Was heute erreicht wurde

### NFC Player v2 (XD iPhone 14 Pro Max 430×932)

- V1-Mobile-Player entfernt; UI aus XD-Layern (`NfcPlayerV2.tsx`, `nfc-player-v2-layout.ts`, Assets unter `public/nfc/player-v2/`).
- Layer-Z-Order, Slider auf Diagonal, EQ in Equalizerfläche, Skip-Flash, Stop/Pause, Desktop-Code, Doto-Schrift.
- **Gestell:** volles `gestell.svg` (~10,8 MB) vom User (über REAKTON-Branch `cursor/club-robot-scene-d206`) in agent-Branch integriert; lädt auf dem Server, aber **langsam** → **Optimierung morgen** (SVGOMG / PNG 430×956 / Lazy).
- **Text:** Titel-Box **X=350, Y=530**; Timer **X=130, Y=620**; Skalierung innen (`scale` 2 / 2,5). Feintuning über `NFC_V2_TEXT_SONGTITLE` / `NFC_V2_TEXT_TIME` → `nudgeX`, `nudgeY` (Pixel auf Artboard).
- **REAL CD:** Rotation **200 RPM** via `useNfcCdRotation` (rAF, DOM-`transform`). Dreht wenn **`!paused`** (beim Öffnen mit Play-Intent). Autoplay: `canplay` abwarten, `pause`-Events während `load()` ignorieren (`trackLoadingRef`).

### User-Git / Assets

- `gestell.svg` war zuerst auf falschem Branch committed; Flow dokumentiert: `git fetch agent`, Branch `cursor/nfc-player-v2-d206` tracken, auf **agent** pushen.

---

## Wichtige Dateien

| Pfad | Rolle |
|------|--------|
| `src/components/nfc/NfcPlayerV2.tsx` | Haupt-UI, Audio, CD, Controls |
| `src/lib/nfc-player-v2-layout.ts` | XD-Rects, Z-Index, Text-Tweaks |
| `src/lib/nfc-player-v2-assets.ts` | Asset-URLs, `NFC_CD_RPM = 200` |
| `src/hooks/useNfcCdRotation.ts` | CD-Rotation + `nfcPrepareAudioPlayback` |
| `public/nfc/player-v2/` | Layer-PNGs + `gestell.svg` |

---

## Morgen (Backlog)

1. **Gestell.svg optimieren** (Ladezeit) — ohne Layout zu ändern.
2. **Text-Position** ggf. mit `nudgeX`/`nudgeY` oder XD-Rects nach Screenshot-Feedback.
3. **Feinschliff** Slider, Skip-Hitareas, Marquee-Titel, ggf. NFC-Tap → garantiertes `play()` wenn Browser Autoplay zickt.
4. PR #16 reviewen / mergen nach `reakton-main`, Deploy-Branch auf VPS festlegen.

---

## Kurz-Checks nach Deploy

```bash
wc -c /var/www/reakton/public/nfc/player-v2/gestell.svg   # ~10756947
curl -sI https://reakton.de/nfc/player-v2/gestell.svg | grep -i content-length
```

Admin-Footer: Build-Label `nfc-player-v2-autoplay-cd-2026-09-10`.

---

*REAKTON WEBSITE 2026 — nicht Debatefy / nicht DAWERSION.*
