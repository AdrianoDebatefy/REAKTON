# Club robot local dev server (Windows PowerShell 5.1+)
# Run: .\scripts\start-club-robot-dev.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "REAKTON Club Robot Dev" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"
Write-Host ""

$branch = git branch --show-current 2>$null
if ($branch -ne "cursor/club-robot-scene-d206") {
  Write-Host "WARNING: branch is '$branch', expected cursor/club-robot-scene-d206" -ForegroundColor Yellow
  Write-Host "  git fetch beta" -ForegroundColor DarkGray
  Write-Host "  git checkout cursor/club-robot-scene-d206" -ForegroundColor DarkGray
  Write-Host "  git pull beta cursor/club-robot-scene-d206" -ForegroundColor DarkGray
  Write-Host ""
}

$envFile = Join-Path $ProjectRoot ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Host "Creating .env.local ..." -ForegroundColor Yellow
  Set-Content -Path $envFile -Value "NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true" -Encoding utf8
} else {
  $envContent = Get-Content $envFile -Raw
  if ($envContent -notmatch "NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true") {
    Write-Host "WARNING: .env.local missing NEXT_PUBLIC_CLUB_ROBOT_PREVIEW=true" -ForegroundColor Yellow
  }
}

$glb = Join-Path $ProjectRoot "public\worlds\reakton_hires_Robot_Modell.glb"
if (-not (Test-Path $glb)) {
  Write-Host "ERROR: robot model missing:" -ForegroundColor Red
  Write-Host "  $glb" -ForegroundColor Red
  exit 1
}

$nodeModules = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path $nodeModules)) {
  Write-Host "Running npm install ..." -ForegroundColor Yellow
  npm install
}

$devPort = 3000
$listeners = Get-NetTCPConnection -LocalPort $devPort -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
  Write-Host "Port $devPort is in use. Stopping old node processes ..." -ForegroundColor Yellow
  foreach ($listener in $listeners) {
    $proc = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -match "node") {
      $procId = $proc.Id
      Write-Host ("  Stopping " + $proc.ProcessName + " (id " + $procId + ")") -ForegroundColor DarkGray
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Seconds 1
}

$nextCache = Join-Path $ProjectRoot ".next"
Remove-Item -Recurse -Force $nextCache -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Starting dev server: http://localhost:$devPort" -ForegroundColor Green
Write-Host "Test page:         http://localhost:$devPort/dev/club-robot" -ForegroundColor Green
Write-Host "Keep this terminal open. Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

& npm run dev -- --port $devPort
