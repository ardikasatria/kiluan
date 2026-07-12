#!/usr/bin/env sh
# Bersihkan cache & sampah Docker untuk hemat disk/RAM — jalankan dari folder deploy/:
#   chmod +x scripts/docker-cleanup.sh
#   ./scripts/docker-cleanup.sh              # aman (disarankan)
#   ./scripts/docker-cleanup.sh --dry-run    # simulasi, tidak menghapus
#   ./scripts/docker-cleanup.sh --agresif    # lebih dalam (image tidak terpakai ikut dihapus)
#
# Aman secara default:
#   - TIDAK menghapus volume (db_data, redis_data, minio_data, caddy_data tetap)
#   - TIDAK menghentikan container yang sedang berjalan
#   - Hanya: container berhenti, image menggantung, build cache, network tidak terpakai

set -eu

MODE="aman"
DRY_RUN=0
COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-}"

usage() {
  cat <<'EOF'
Pemakaian: ./scripts/docker-cleanup.sh [opsi]

Opsi:
  --dry-run    Tampilkan perintah & perkiraan ruang, tanpa menghapus
  --agresif    Hapus juga image yang tidak dipakai container mana pun (perlu rebuild)
  -h, --help   Bantuan singkat

Contoh setelah deploy/build berulang:
  ./scripts/docker-cleanup.sh
  ./scripts/docker-cleanup.sh --agresif

Setelah cleanup agresif, bangun ulang stack bila perlu:
  docker compose --env-file .env up -d --build
EOF
}

log() {
  printf '%s\n' "$*"
}

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    log "[dry-run] $*"
    return 0
  fi
  log ">> $*"
  # shellcheck disable=SC2086
  eval "$@"
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --agresif) MODE="agresif" ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      log "Opsi tidak dikenal: $arg"
      usage
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  log "Docker tidak ditemukan di PATH."
  exit 1
fi

# Deteksi project compose sigerciv bila dijalankan dari deploy/
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEPLOY_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
if [ -f "$DEPLOY_DIR/docker-compose.yml" ]; then
  cd "$DEPLOY_DIR"
fi

log "==> Pembersihan Docker sigerciv (mode: $MODE)"
if [ "$DRY_RUN" -eq 1 ]; then
  log "    Simulasi — tidak ada yang dihapus"
fi

log ""
log "==> Penggunaan disk sebelum"
docker system df 2>/dev/null || true

log ""
log "==> Container berjalan (tidak disentuh)"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Size}}' 2>/dev/null || true

log ""
log "==> 1/4 Container berhenti (dangling)"
run "docker container prune -f"

log ""
log "==> 2/4 Image menggantung (dangling)"
run "docker image prune -f"

log ""
log "==> 3/4 Build cache"
if [ "$MODE" = "agresif" ]; then
  run "docker builder prune -af"
else
  # Cache build > 48 jam — hemat disk tanpa menghapus layer build terbaru
  run "docker builder prune -af --filter 'until=48h'"
fi

log ""
log "==> 4/4 Network tidak terpakai"
run "docker network prune -f"

if [ "$MODE" = "agresif" ]; then
  log ""
  log "==> Agresif: image tidak terpakai (selain yang dipakai container aktif)"
  run "docker image prune -af"
fi

log ""
log "==> Volume (hanya laporan — TIDAK dihapus otomatis)"
docker volume ls 2>/dev/null || true
log "    Volume data sigerciv (db/redis/minio/caddy) sengaja dilewati."
log "    Hapus volume hanya jika yakin: docker compose down -v  (DATA HILANG)"

log ""
log "==> Penggunaan disk sesudah"
docker system df 2>/dev/null || true

log ""
log "Selesai."
if [ "$MODE" = "agresif" ] && [ "$DRY_RUN" -eq 0 ]; then
  log "Jika layanan error setelah cleanup agresif:"
  log "  docker compose --env-file .env up -d --build"
fi
