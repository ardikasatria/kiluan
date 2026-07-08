#!/usr/bin/env sh
# Smoke test — jalankan dari folder deploy/
#   ./scripts/smoke.sh [FRONTEND_URL] [API_URL]
set -eu

FRONT="${1:-http://localhost}"
API="${2:-${FRONT}}"

echo "==> GET $API/api/v1/sehat"
curl -fsS "$API/api/v1/sehat" | head -c 500
echo ""

echo "==> GET $FRONT/ (frontend)"
code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONT/")
echo "HTTP $code"

echo "==> GET $FRONT/teluk-kiluan"
code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONT/teluk-kiluan")
echo "HTTP $code"

echo "OK — stack merespons"
