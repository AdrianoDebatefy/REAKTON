# REAKTON WEBSITE 2026 — Transfer zu GitHub

Der vollständige Stand liegt in diesem Branch (`cursor/reakton-website-2026-transfer-d206`).
Repo-Root = Next.js-App (kein `reakton-website/` Unterordner mehr).

## Einmalig auf deinem Rechner pushen (ca. 2 Minuten)

Der Cloud-Agent hat **keinen Schreibzugriff** auf `AdrianoDebatefy/REAKTON`.
Mit deinem GitHub-Account:

```bash
git clone --branch cursor/reakton-website-2026-transfer-d206 --single-branch \
  https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour.git reakton-push
cd reakton-push
git remote set-url origin https://github.com/AdrianoDebatefy/REAKTON.git
git push -u origin main
```

Danach lokal nur noch REAKTON klonen:

```bash
git clone https://github.com/AdrianoDebatefy/REAKTON.git
cd REAKTON
npm install
npm run dev
```

## Cursor Cloud Agent dauerhaft auf REAKTON

1. GitHub → **AdrianoDebatefy/REAKTON** → Settings → Collaborators  
   → Cursor/GitHub-App **Write**-Zugriff geben  
2. Neue Cloud-Agent-Session mit Repo **REAKTON** starten (nicht `debatyfyOnlinebetaFour`)

## Alternative: Git-Bundle

Falls der Branch noch nicht gepusht ist, liegt im Workspace auch `REAKTON-WEBSITE-2026.bundle`:

```bash
git clone REAKTON-WEBSITE-2026.bundle reakton-temp
cd reakton-temp
git remote add origin https://github.com/AdrianoDebatefy/REAKTON.git
git push -u origin main
```
