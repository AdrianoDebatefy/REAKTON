# Desktop wiederherstellen (Windows)

Wenn Desktop oder Admin „alt“ wirken oder keine Bilder zeigen, liegt das fast immer an **falschem Branch**, **lokaler Daten-Datei** oder **fehlenden Bildern** — nicht am Mobile-Branch-Code allein.

## 1. Richtigen Stand holen (REAKTON main — nicht Mobile-Branch)

```powershell
cd C:\Users\adria\REAKTON

# Remote prüfen
git remote -v

# Kanonischen Stand von REAKTON main
git fetch https://github.com/AdrianoDebatefy/REAKTON.git main
git checkout -B desktop-stable FETCH_HEAD

# Oder festen Commit (identisch zu REAKTON main + Handoff-Doc):
# git reset --hard 6065f6b
```

**Nicht** für Desktop-Tests: `cursor/mobile-version-d206` (Mobile-Experimente).

## 2. Cache und Build löschen

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
npm install
npm run dev
```

Browser: **Strg+Shift+R** (Hard-Reload). Desktop testen bei **≥ 768px** Breite.

## 3. Admin: richtige Version erkennen

Nach erfolgreichem Update zeigt `/admin` oben Tabs:

`Content` · `Header` · `Live` · `Presse` · `Kontakt` · `Analytics` · `Zugang`

Felder heißen z. B. **„Hintergrund Desktop (16:9)“** — nicht „Welt-Hintergrund Bild (z. B. Erde)“.

Wenn du die alte Oberfläche siehst → falscher Commit oder alter `.next`-Cache.

## 4. Lokale Admin-Daten zurücksetzen

Admin speichert in `data/site-content.local.json` (überschreibt Git-Daten).

```powershell
Rename-Item data\site-content.local.json site-content.local.json.bak -ErrorAction SilentlyContinue
```

Danach Dev-Server neu starten. Im Admin unter Content → Weltall → **Hintergrund Desktop** sollte `/worlds/Erde.jpg` stehen.

## 5. Bilder prüfen (nicht in Git)

```powershell
dir C:\Users\adria\REAKTON\public\worlds\
```

Mindestens lokal vorhanden:

- `Erde.jpg`
- `nano.jpg`
- `club-bg.jpg`

Im Browser testen:

- http://localhost:3000/worlds/Erde.jpg
- http://localhost:3000/worlds/nano.jpg

404 = Datei fehlt → Desktop zeigt nur Farbverläufe ohne Fotos.

## 6. Commit prüfen

```powershell
git log -1 --oneline
```

Erwartet für Desktop-Stable: `6065f6b` oder `2a429e2` (REAKTON main) — gleicher App-Code.

## 7. Mobile weiterarbeiten (später)

Mobile nur in separaten Dateien (`MobileWorldLanding.tsx` etc.), **ohne** `WorldColumns.tsx` Desktop zu ändern. Branch: `cursor/mobile-version-d206` auf debatyfyOnlinebetaFour.
