Clip:Clap:Club — 3D Roboter (Desktop Preview)
=============================================

WICHTIG: Slider nur auf der Dev-Testseite
-----------------------------------------

Der Roboter erscheint an zwei Stellen:

1. Startseite → Clip:Clap:Club öffnen  → Roboter JA, Slider NEIN
2. http://localhost:3000/dev/club-robot → Roboter JA, Slider JA (rechts)

Windows — Installation prüfen (Schritt für Schritt)
---------------------------------------------------

Schritt 1 — Projektordner
  cd C:\Users\adria\REAKTON

Schritt 2 — Branch prüfen
  git branch
  → muss * cursor/club-robot-scene-d206 zeigen

  Falls nicht:
  git fetch beta
  git checkout cursor/club-robot-scene-d206
  git pull beta cursor/club-robot-scene-d206

Schritt 3 — Neuesten Stand prüfen (Slider-Commit)
  git log --oneline -1
  → sollte enthalten: "Add dev tuning sliders" (ab5f60e oder neuer)

Schritt 4 — Dateien prüfen
  Test-Path src\components\worlds\club\ClubRobotTuningPanel.tsx
  Test-Path src\app\dev\club-robot\page.tsx
  Test-Path public\worlds\reakton_hires_Robot_Modell.glb
  → alle drei müssen True sein

Schritt 5 — .env.local
  Get-Content .env.local
  → muss enthalten: NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true

  Falls Datei fehlt:
  Set-Content -Path .env.local -Value "NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true"

Schritt 6 — Cache löschen & installieren
  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
  npm install

Schritt 7 — Dev-Server (aus REAKTON-Ordner!)
  npm run dev

  Oder alles in einem (empfohlen unter Windows):
  .\scripts\start-club-robot-dev.ps1

  WICHTIG: Das Terminal muss offen bleiben. Ohne laufenden Server
  ist localhost nicht erreichbar.

Schritt 8 — Browser
  http://localhost:3000/dev/club-robot
  Hard-Reload: Strg+Shift+R

  Im Terminal steht nach dem Start z.B.:
    Local: http://localhost:3000
  Diese URL im Browser öffnen (nicht reakton.de).

Website nicht erreichbar? (Troubleshooting)
---------------------------------------------
1. Läuft npm run dev noch? Terminal offen? Kein "error" / "EADDRINUSE"?
2. Richtige URL? → http://localhost:3000 (oder Port aus Terminal-Ausgabe)
3. Port 3000 belegt?
     Get-NetTCPConnection -LocalPort 3000 -State Listen
   Alten Node-Prozess beenden oder Script nutzen:
     .\scripts\start-club-robot-dev.ps1
4. Aus richtigem Ordner gestartet?
     pwd  → muss C:\Users\adria\REAKTON sein
5. Firewall: Node.js bei erster Abfrage „Zulassen“
6. Nach Fehlermeldung im Terminal:
     Remove-Item -Recurse -Force .next
     npm install
     npm run dev

Schritt 9 — Slider finden
  Rechts am Bildschirmrand: Panel „Roboter Tuning"
  Falls zu: Button „◀ Tuning" am rechten Rand anklicken

Schritt 10 — Werte übernehmen
  Slider justieren → „Config“ klicken → Code in club-robot.ts einfügen

Remote beta hinzufügen (einmalig)
---------------------------------
  git remote add beta https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour.git
  git fetch beta
