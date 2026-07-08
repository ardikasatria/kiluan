#!/bin/sh
# Inisialisasi bucket MinIO — dipanggil sekali oleh service minio-init.
set -eu

echo "==> Menghubungkan ke MinIO..."
mc alias set local "http://minio:9000" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

echo "==> Membuat bucket: ${MINIO_BUCKET}"
mc mb --ignore-existing "local/${MINIO_BUCKET}"

echo "==> Kebijakan unduhan publik (read-only)..."
mc anonymous set download "local/${MINIO_BUCKET}"

echo "==> Bucket ${MINIO_BUCKET} siap."
