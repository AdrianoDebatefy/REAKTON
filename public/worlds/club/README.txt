Clip:Clap:Club — 3D Roboter (Desktop Preview)
=============================================

Lokaler Test — nicht auf den Live-Server deployen, bis Ray freigibt.

Windows — Schritt für Schritt (PowerShell)
------------------------------------------

1. Branch holen (im Projektordner REAKTON):

   cd C:\Users\adria\REAKTON
   git remote -v
   git fetch origin
   git checkout -b cursor/club-robot-scene-d206 origin/cursor/club-robot-scene-d206

   Falls "couldn't find remote ref":
   - Remote muss auf github.com/AdrianoDebatefy/debatyfyOnlinebetaFour zeigen
   - Oder: git fetch origin --prune && git branch -r

2. .env.local anlegen (NICHT in der Konsole tippen — Datei erstellen):

   Set-Content -Path .env.local -Value "NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true"

   Oder manuell: Datei .env.local im Projektroot mit genau dieser Zeile.

3. GLB (exakter Dateiname):

   public\worlds\humanoid robot 3d model.glb

4. Abhängigkeiten + Dev-Server:

   Remove-Item -Recurse -Force node_modules,.next -ErrorAction SilentlyContinue
   npm install
   npm run dev

5. Im Browser öffnen:

   http://localhost:3000/dev/club-robot

Lockfile-Warnung
----------------

Wenn Next.js C:\Users\adria\package-lock.json statt REAKTON nutzt:
- Im Ordner REAKTON starten (nicht darüber)
- Optional übergeordnete package-lock.json entfernen, falls nicht gebraucht

Bone-Namen
----------

Der Kopf sucht Bones mit Namen wie Head, Neck, mixamorigHead.
Falls der Blick nicht reagiert: src/lib/club-robot.ts → CLUB_ROBOT_HEAD_BONE_HINTS

Feintuning
----------

src/lib/club-robot.ts — Kamera, Modell-Scale, Blick-Winkel, Fade-Dauer.

Ohne Modell
-----------

Placeholder-Büste mit Maus-Tracking, bis die GLB-Datei liegt.

Modell-Export (Blender)
-----------------------

GLB ist ideal. Falls der Mesh kaputt aussieht, neu exportieren mit:

- Format: glTF Binary (.glb)
- +Y Up
- „Apply Transform“ / Applied Modifiers
- Keine laufende Animation im Export (Rest Pose / T-Pose)
- Optional: nur Oberkörper (ab Hüfte) für besseres Framing
