# REAKTON Website — Session-Handoff (29.07.2026)

> **Zweck:** Nahtlos nach dem Meeting weitermachen. Stand nach Label-Animation, Admin-Links und Sprachwechsel in der Welt.

---

## Projekt & Pfade

| | |
|---|---|
| **Repo** | https://github.com/AdrianoDebatefy/REAKTON |
| **Projekt** | REAKTON WEBSITE 2026 (Repo-Root) |
| **Lokal (Windows)** | `C:\Users\adria\REAKTON` |
| **Branch** | `main` |

---

## Lokal starten (PowerShell)

```powershell
cd C:\Users\adria\REAKTON
npm run dev
```

- Startseite: http://localhost:3000/de (Hard-Refresh: **Strg + Shift + R**)
- Admin: http://localhost:3000/admin — Passwort: **`reakton-admin`**

**Behalten beim Update:** `data/site-content.local.json` und `public/uploads/`

---

## Animations-Ablauf (Landing ↔ Welt)

### Welt betreten (Klick auf Spalte)
1. **Labels codieren heraus** (~720 ms, alle 3 Spalten)
2. **Dann** Spalten-Animation + Welt öffnet sich

### Zurück zur Landingpage
1. Welt baut ab (Cover-Exit, Spalten-Animation wie bisher)
2. **Erst danach** Labels **decodieren rein** und bleiben stehen (`static`)

### Sprache wechseln (in der Welt)
- Hintergrund + Covers bleiben
- Nur Texte (Zurück, welcome to, Titel) codieren um
- Kein Landing-Flash (Session + client-only `WorldColumns`)

---

## Was funktioniert

### Landing
- 3 Spalten, Clip-Pan-Hintergründe, Decode-Labels unten (30px)
- Decode-Effekt: `src/components/DecodeText.tsx`

### Welt / Cover-Motiv
- Kein Player — nur Motiv + unterer Balken (Titel, optional watch video)
- Lautstärke-Regler bei Hover (wenn Audio-Loop)
- YouTube stoppt Audio-Loop

### Header
- Logo 30px Höhe, 50px Padding links (Admin: `brandLogo`)
- Nav-Chips farbig, 30px
- Links: Merchandise, Presse, YT, IG, FB (Admin: `siteLinks`)

### Admin (`/admin`)
- Welten + Cover-Slots, Logo, Header-Links
- Speichern → `data/site-content.local.json`
- Backup exportieren / importieren

---

## Wichtige Dateien

| Datei | Inhalt |
|-------|--------|
| `src/components/worlds/WorldColumns.tsx` | Landing, Labels, Übergänge |
| `src/components/DecodeText.tsx` | Codier-/Decodier-Effekt |
| `src/components/worlds/WorldView.tsx` | Welt-Kopf, Sprach-Decode |
| `src/components/worlds/AlbumSlotScene.tsx` | Cover-Motiv |
| `src/lib/world-session.ts` | Welt-Zustand + Sprachwechsel |
| `src/components/admin/AdminPanel.tsx` | Admin inkl. Logo + Links |
| `data/site-content.local.json` | Deine Test-Inhalte (gitignored) |

---

## Offene / optionale nächste Schritte

1. Club-Welt: restliche Covers befüllen / layouten
2. Nav-Chip-Farben feintunen
3. Press-Seite: Inhalte im Admin erweitern?
4. Waypoint-Tag nach stabilem Stand setzen

---

## Letzte Commits (Thema heute)

- Decode-Labels Landing/Welt
- Motiv-Player vereinfacht + Lautstärke + YouTube-Fix
- Admin: lokale Persistenz, Logo, Header-Links
- Sprachwechsel in Welt ohne Neuaufbau
- Label-Sequenz: raus → Welt / zurück → Spalten → Labels rein

---

*Erstellt: 29.07.2026 — vor Meeting*
