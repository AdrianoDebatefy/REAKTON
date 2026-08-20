# Von Windows: lokale Assets auf den Netcup VPS hochladen
# Anpassen: $Server = "root@DEINE-VPS-IP"

param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [string]$RemotePath = "/var/www/reakton/public"
)

$ErrorActionPreference = "Stop"
$Root = "C:\Users\adria\REAKTON"

if (-not (Test-Path $Root)) {
  throw "Ordner nicht gefunden: $Root"
}

Set-Location $Root

Write-Host "==> Lade public/worlds (*.jpg) hoch ..."
$worldJpg = Get-ChildItem -Path "public\worlds\*.jpg" -ErrorAction SilentlyContinue
if ($worldJpg) {
  scp @($worldJpg.FullName) "${Server}:${RemotePath}/worlds/"
} else {
  Write-Warning "Keine JPG in public\worlds"
}

Write-Host "==> Lade Roboter-Modell (GLB) hoch ..."
$glb = Get-ChildItem -Path "public\worlds\*.glb" -ErrorAction SilentlyContinue
if ($glb) {
  scp @($glb.FullName) "${Server}:${RemotePath}/worlds/"
} else {
  Write-Warning "Kein GLB in public\worlds — reakton_hires_Robot_Modell.glb fehlt lokal"
}

Write-Host "==> Lade public/og hoch ..."
if (Test-Path "public\og") {
  scp -r "public\og\*" "${Server}:${RemotePath}/og/"
} else {
  Write-Warning "public\og nicht gefunden"
}

Write-Host "==> Logo ..."
if (Test-Path "public\brand\reakton-logo.webp") {
  scp "public\brand\reakton-logo.webp" "${Server}:${RemotePath}/brand/"
}

Write-Host "==> Fertig. Auf dem Server pruefen:"
Write-Host "    ssh $Server 'ls -la ${RemotePath}/worlds/'"
