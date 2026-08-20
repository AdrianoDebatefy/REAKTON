Clip:Clap:Club — 3D Roboter (Desktop Preview)
=============================================

Lokaler Test — nicht auf den Live-Server deployen, bis Ray freigibt.

Setup
-----

1. `.env.local` anlegen (oder ergänzen):

   NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true

2. GLB ablegen (exakter Dateiname):

   public/worlds/humanoid robot 3d model.glb

   Windows-Quelle:
   c:\Users\adria\REAKTON\public\worlds\humanoid robot 3d model.glb

3. Dev-Server starten:

   npm run dev

4. Testen:

   - Isoliert:  http://localhost:3000/de/dev/club-robot
   - Voll-Flow: Startseite → Clip:Clap:Club klicken → Welt öffnet →
     Weltbild faded weg → Roboter auf Rot (#9e1d23)

Bone-Namen
----------

Der Kopf sucht Bones mit Namen wie Head, Neck, mixamorigHead.
Falls der Blick nicht reagiert: Bone-Namen in src/lib/club-robot.ts
(CLUB_ROBOT_HEAD_BONE_HINTS) ergänzen.

Feintuning
----------

src/lib/club-robot.ts — Kamera, Modell-Scale, Blick-Winkel, Fade-Dauer.

Ohne Modell
-----------

Placeholder-Büste mit Maus-Tracking, bis die FBX-Datei liegt.
