#!/usr/bin/env sh
# Cek port 80/443 sebelum deploy Caddy — jalankan di VM:
#   ./scripts/preflight.sh
set -eu

cek_port() {
  port="$1"
  if command -v ss >/dev/null 2>&1; then
    if ss -tlnH "sport = :$port" 2>/dev/null | grep -q .; then
      echo "❌ Port $port sudah dipakai:"
      ss -tlnp "sport = :$port" 2>/dev/null || ss -tln "sport = :$port"
      return 1
    fi
  elif command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:"$port" -sTCP:LISTEN -P -n 2>/dev/null | grep -q .; then
      echo "❌ Port $port sudah dipakai:"
      lsof -iTCP:"$port" -sTCP:LISTEN -P -n
      return 1
    fi
  else
    echo "⚠️  ss/lsof tidak ada — lewati cek port $port"
    return 0
  fi
  echo "✅ Port $port bebas"
  return 0
}

echo "==> Cek prasyarat deploy sigerciv"
fail=0
cek_port 80 || fail=1
cek_port 443 || fail=1

echo ""
echo "==> Container Docker yang memakai port 80/443"
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' 2>/dev/null \
  | grep -E '(:80->|:443->|NAMES)' || echo "(tidak ada / docker tidak jalan)"

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Bebaskan port 80 & 443, lalu ulangi deploy:"
  echo "  docker compose down --remove-orphans"
  echo "  sudo systemctl stop nginx apache2 caddy 2>/dev/null || true"
  echo "  docker compose --env-file .env up -d"
  exit 1
fi

echo ""
echo "Siap deploy."
