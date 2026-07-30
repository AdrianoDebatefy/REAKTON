# GitHub fix — REAKTON einmal sauber einrichten

Wenn `git pull` meldet **refusing to merge unrelated histories**, lokaler Ordner und GitHub haben zwei getrennte Histories. Einmal so reparieren:

## 1. Lokale Daten sichern (falls vorhanden)

```powershell
mkdir C:\Users\adria\reakton-backup -Force
Copy-Item C:\Users\adria\REAKTON\data\site-content.local.json C:\Users\adria\reakton-backup\ -ErrorAction SilentlyContinue
Copy-Item C:\Users\adria\REAKTON\public\uploads C:\Users\adria\reakton-backup\uploads -Recurse -ErrorAction SilentlyContinue
```

## 2. GitHub REAKTON mit sauberem Stand überschreiben

```powershell
cd C:\Users\adria
git clone --branch reakton-main --single-branch https://github.com/AdrianoDebatefy/debatyfyOnlinebetaFour.git reakton-github-fix
cd reakton-github-fix
git remote set-url origin https://github.com/AdrianoDebatefy/REAKTON.git
git push -f origin reakton-main:main
```

Erwartung: `main -> main (forced update)` — kein `403`.

## 3. Lokalen Ordner neu klonen

```powershell
cd C:\Users\adria
Rename-Item REAKTON REAKTON-alt -ErrorAction SilentlyContinue
git clone https://github.com/AdrianoDebatefy/REAKTON.git REAKTON
cd REAKTON
```

## 4. Backup zurück

```powershell
Copy-Item C:\Users\adria\reakton-backup\site-content.local.json data\ -ErrorAction SilentlyContinue
Copy-Item C:\Users\adria\reakton-backup\uploads\* public\uploads\ -Recurse -ErrorAction SilentlyContinue
```

## 5. Starten

```powershell
npm install
npm run dev
```

Ab dann nur noch:

```powershell
cd C:\Users\adria\REAKTON
git pull origin main
npm run dev
```

## Cursor Cloud Agent

GitHub → **AdrianoDebatefy/REAKTON** → Settings → Collaborators → Cursor/GitHub-App **Write**, damit der Agent direkt pushen kann.
