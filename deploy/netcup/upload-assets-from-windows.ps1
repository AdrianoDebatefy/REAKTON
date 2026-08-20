# Upload local public assets to Netcup VPS (Windows PowerShell 5.1+)
# Run: .\deploy\netcup\upload-assets-from-windows.ps1 -Server ray@v2202512327578422024

param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [string]$RemotePath = "/var/www/reakton/public"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

if (-not (Test-Path $Root)) {
  throw ("Project folder not found: " + $Root)
}

Set-Location $Root
Write-Host ("Project: " + $Root)

Write-Host "==> Upload public/worlds (*.jpg) ..."
$worldJpg = Get-ChildItem -Path "public\worlds\*.jpg" -ErrorAction SilentlyContinue
if ($worldJpg) {
  scp @($worldJpg.FullName) ($Server + ":" + $RemotePath + "/worlds/")
} else {
  Write-Warning "No JPG files in public\worlds"
}

Write-Host "==> Upload robot model (*.glb) ..."
$glb = Get-ChildItem -Path "public\worlds\*.glb" -ErrorAction SilentlyContinue
if ($glb) {
  scp @($glb.FullName) ($Server + ":" + $RemotePath + "/worlds/")
} else {
  Write-Warning "No GLB in public\worlds - reakton_hires_Robot_Modell.glb missing locally"
}

Write-Host "==> Upload public/og ..."
if (Test-Path "public\og") {
  scp -r "public\og\*" ($Server + ":" + $RemotePath + "/og/")
} else {
  Write-Warning "public\og not found"
}

Write-Host "==> Upload logo ..."
if (Test-Path "public\brand\reakton-logo.webp") {
  scp "public\brand\reakton-logo.webp" ($Server + ":" + $RemotePath + "/brand/")
}

Write-Host "==> Done. Verify on server:"
$checkCmd = "ls -la " + $RemotePath + "/worlds/"
Write-Host ("    ssh " + $Server + " " + $checkCmd)
