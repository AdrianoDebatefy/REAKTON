# Lokaler Dev-Server für Clip:Clap:Club Roboter-Test
# Ausführen: .\scripts\start-club-robot-dev.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "REAKTON — Club Roboter Dev" -ForegroundColor Cyan
Write-Host "Projekt: $ProjectRoot"
Write-Host ""

# Branch
$branch = git branch --show-current 2>$null
if ($branch -ne "cursor/club-robot-scene-d206") {
  Write-Host "WARNUNG: Branch ist '$branch', erwartet cursor/club-robot-scene-d206" -ForegroundColor Yellow
  Write-Host "  git fetch beta" -ForegroundColor DarkGray
  Write-Host "  git checkout cursor/club-robot-scene-d206" -ForegroundColor DarkGray
  Write-Host "  git pull beta cursor/club-robot-scene-d206" -ForegroundColor DarkGray
  Write-Host ""
}

# .env.local
$envFile = Join-Path $ProjectRoot ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Host "Erstelle .env.local ..." -ForegroundColor Yellow
  Set-Content -Path $envFile -Value "NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true"
} else {
  $envContent = Get-Content $envFile -Raw
  if ($envContent -notmatch "NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true") {
    Write-Host "WARNUNG: .env.local enthält nicht NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true" -ForegroundColor Yellow
  }
}

# GLB
$glb = Join-Path $ProjectRoot "public\worlds\reakton_hires_Robot_Modell.glb"
if (-not (Test-Path $glb)) {
  Write-Host "FEHLER: Roboter-Modell fehlt:" -ForegroundColor Red
  Write-Host "  $glb" -ForegroundColor Red
  exit 1
}

# node_modules
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
  Write-Host "npm install ..." -ForegroundColor Yellow
  npm install
}

# Port 3000 freimachen (optional)
$port = 3000
$listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
  Write-Host "Port $port ist belegt. Alte Node-Prozesse beenden ..." -ForegroundColor Yellow
  $listeners | ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -match "node") {
      $procId = $proc.Id
      Write-Host ('  Beende ' + $proc.ProcessName + ' (Id ' + $procId + ')') -ForegroundColor DarkGray
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Seconds 1
}

Remove-Item -Recurse -Force (Join-Path $ProjectRoot ".next") -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Starte Dev-Server auf http://localhost:$port" -ForegroundColor Green
Write-Host "Test-URL:     http://localhost:$port/dev/club-robot" -ForegroundColor Green
Write-Host "Terminal offen lassen — Strg+C zum Beenden." -ForegroundColor DarkGray
Write-Host ""

npm run dev -- -p $port
