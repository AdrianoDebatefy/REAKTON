# Export keyframes from a screen recording for Cloud-Agent review.
# Requires ffmpeg: winget install Gyan.FFmpeg  (or choco install ffmpeg)
#
# Usage:
#   .\scripts\export-review-frames.ps1 "X:\KUNDEN\REAKTON\WEBSEITE2026\Aufzeichnung 2026-08-09 204846.mp4"

param(
    [Parameter(Mandatory = $true)]
    [string]$VideoPath
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outDir = Join-Path $repoRoot "docs\mobile-review\latest"

if (-not (Test-Path $VideoPath)) {
    Write-Error "Video not found: $VideoPath"
}

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Error "ffmpeg not found. Install: winget install Gyan.FFmpeg"
}

if (Test-Path $outDir) {
    Remove-Item -Recurse -Force $outDir
}
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# 2 frames per second — enough for UI/animation review without huge commits
& ffmpeg -hide_banner -loglevel error -i $VideoPath -vf "fps=2" -q:v 3 (Join-Path $outDir "frame_%04d.jpg")

$count = (Get-ChildItem $outDir -Filter "*.jpg").Count
Write-Host "Exported $count frames to $outDir"
Write-Host "Next: git add docs/mobile-review && git commit && git push"
