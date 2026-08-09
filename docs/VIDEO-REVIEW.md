# Video-Review Workflow (Mobile / UI)

## pCloud (Archiv + Link an Agent)

Der Agent kann den **Ordnerinhalt** lesen (`showpublink` API), aber **kein MP4 zuverlässig herunterladen**: pCloud bindet Download-Links an die IP, die den Link erzeugt hat. Cloud-Agenten haben oft unterschiedliche Egress-IPs (API vs. CDN) → `410` / *„generated for another IP address“*.

**Empfohlen:** Video auf pCloud lassen, Frames lokal exportieren (siehe unten).

## Frames exportieren (Windows, einmalig ffmpeg)

```powershell
cd C:\Users\adria\REAKTON
.\scripts\export-review-frames.ps1 "X:\KUNDEN\REAKTON\WEBSEITE2026\Aufzeichnung 2026-08-09 204846.mp4"
git add docs/mobile-review
git commit -m "chore: mobile review frames"
git push
```

Der Cloud-Agent analysiert dann `docs/mobile-review/latest/*.jpg`.

## Alternative: YouTube (nicht gelistet)

Funktioniert oft direkt vom Agent ohne lokales Script — Link im Chat posten.
