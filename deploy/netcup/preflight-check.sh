#!/usr/bin/env bash
# Vor dem REAKTON-Deploy auf dem Netcup VPS ausführen:
#   bash deploy/netcup/preflight-check.sh
# oder nach git clone:
#   curl -sL ... | bash   (nicht empfohlen — besser aus dem Repo)

set -euo pipefail

echo "=============================================="
echo "  REAKTON — Netcup VPS Preflight Check"
echo "  $(date -Is 2>/dev/null || date)"
echo "=============================================="
echo ""

section() {
  echo ""
  echo "--- $1 ---"
}

section "System"
echo "Hostname: $(hostname -f 2>/dev/null || hostname)"
uname -a
echo ""

section "CPU"
if command -v nproc >/dev/null 2>&1; then
  echo "Kerne: $(nproc)"
fi
if [[ -f /proc/loadavg ]]; then
  read -r load1 load5 load15 _ < /proc/loadavg
  echo "Load (1/5/15 min): ${load1} / ${load5} / ${load15}"
fi
if command -v lscpu >/dev/null 2>&1; then
  lscpu | grep -E "Model name|CPU\\(s\\)|Thread|MHz" || true
fi

section "RAM"
if command -v free >/dev/null 2>&1; then
  free -h
else
  cat /proc/meminfo | head -5
fi

section "Festplatte (wichtig für /var/www)"
df -h /
df -h /var 2>/dev/null || true
df -h /var/www 2>/dev/null || true
echo ""
echo "Größe /var/www (falls vorhanden):"
du -sh /var/www 2>/dev/null || echo "  /var/www existiert noch nicht"
du -sh /var/www/* 2>/dev/null | sort -hr | head -15 || true

section "Node.js / PM2"
if command -v node >/dev/null 2>&1; then
  echo "Node: $(node -v)"
else
  echo "Node: NICHT INSTALLIERT — vor Deploy: Node 20+ installieren"
fi
if command -v npm >/dev/null 2>&1; then
  echo "npm: $(npm -v)"
fi
if command -v pm2 >/dev/null 2>&1; then
  echo "PM2: $(pm2 -v)"
  echo ""
  pm2 list 2>/dev/null || true
else
  echo "PM2: nicht installiert (npm install -g pm2)"
fi

section "Belegte Ports (3000–3020, 80, 443)"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep -E ':80 |:443 |:300[0-9]|:301[0-9]|:3020 ' || echo "  (keine Treffer in diesem Bereich oder keine Berechtigung für -p)"
elif command -v netstat >/dev/null 2>&1; then
  netstat -tlnp 2>/dev/null | grep -E ':80 |:443 |:300|:301' || true
else
  echo "  ss/netstat nicht verfügbar"
fi
echo ""
echo "Empfohlener REAKTON-Port: 3010 (in deploy/netcup/ecosystem.config.cjs)"
if ss -tln 2>/dev/null | grep -q ':3010 '; then
  echo "  ⚠ Port 3010 ist bereits belegt — anderen Port wählen!"
else
  echo "  ✓ Port 3010 scheint frei"
fi

section "Nginx"
if command -v nginx >/dev/null 2>&1; then
  nginx -v 2>&1
  echo "Aktive Sites:"
  ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
else
  echo "Nginx: nicht gefunden"
fi

section "Geschätzter Bedarf REAKTON"
cat <<'EOF'
  Repo + node_modules + .next build:  ca. 400–700 MB
  public/worlds + og + uploads:       abhängig von deinen Bildern (oft 50–200 MB)
  data/ (Admin, Kontakt, Analytics):  wächst langsam, Planung +100 MB Puffer
  RAM zur Laufzeit (Next.js):         ca. 150–350 MB unter Last
  Empfehlung: mind. 2 GB freier Speicher auf /, 512 MB+ freies RAM
EOF

section "DNS-Hinweis (HostEurope → Netcup)"
cat <<'EOF'
  Domain bleibt bei HostEurope — nur DNS-Einträge ändern, kein Webspace nötig.

  Später bei HostEurope (DNS-Verwaltung für reakton.de):
    A     @              →  IP deines Netcup VPS
    A     www            →  IP deines Netcup VPS   (oder CNAME www → reakton.de)
    AAAA  @              →  IPv6 des VPS (falls Netcup IPv6 nutzt)
    AAAA  www            →  IPv6 (optional)

  Alte Einträge entfernen, die auf HostEurope-Webspace zeigen, z. B.:
    - A/CNAME auf HostEurope-Server-IP
    - Webspace-Subdomains des Providers

  Erst DNS umstellen, wenn die Seite auf dem VPS läuft und per IP:3010
  oder Test-Host erreichbar ist. TTL vorher auf 300–600 s senken.
EOF

echo ""
echo "=============================================="
echo "  Preflight abgeschlossen"
echo "=============================================="
