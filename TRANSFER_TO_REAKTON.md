# REAKTON WEBSITE 2026 — Transfer zu GitHub

Der vollständige Stand liegt in Branch `cursor/reakton-website-2026-transfer-d206` (Staging) bzw. direkt in **REAKTON** nach erfolgreichem Push.

Repo-Root = Next.js-App (kein `reakton-website/` Unterordner).

## Status prüfen

Öffne https://github.com/AdrianoDebatefy/REAKTON — dort sollten u. a. `README.md`, `package.json` und `src/` sichtbar sein.

Falls das Repo noch leer ist, Push erneut ausführen:

```bash
git clone --branch cursor/reakton-website-2026-transfer-d206 --single-branch \
  https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour.git reakton-push
cd reakton-push
git remote set-url origin https://github.com/AdrianoDebatefy/REAKTON.git
git push -u origin HEAD:main
```

Erwartete Meldung: `* [new branch] main -> main` (kein `403` oder `denied`).

## Nach erfolgreichem Push — nur noch REAKTON

```bash
git clone https://github.com/AdrianoDebatefy/REAKTON.git
cd REAKTON
npm install
npm run dev
```

## Cursor Cloud Agent auf REAKTON

1. GitHub → **AdrianoDebatefy/REAKTON** → Settings → Collaborators → Cursor/GitHub-App **Write**
2. Neue Cloud-Agent-Session mit Repo **REAKTON** (nicht `debatyfyOnlinebetaFour`)
