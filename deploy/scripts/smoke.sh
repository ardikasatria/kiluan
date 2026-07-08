#!/usr/bin/env sh
# Smoke test setelah docker compose up — jalankan dari folder deploy/
set -eu

BASE="${1:-http://localhost}"

echo "==> GET $BASE/api/v1/sehat"
curl -fsS "$BASE/api/v1/sehat" | head -c 500
echo ""

echo "==> GET $BASE/ (frontend)"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
echo "HTTP $code"

echo "==> GET $BASE/teluk-kiluan"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/teluk-kiluan")
echo "HTTP $code"

echo "OK — stack merespons"
