"""Adapter MinIO async — presigned PUT & verifikasi objek.

Antarmuka sama dengan `ObjectStorePalsu` di `repo/memori.py` agar `MediaLayanan`
tetap teruji in-memory tanpa MinIO nyata.

File yatim (di-PUT tapi tak dikonfirmasi) dibersihkan via lifecycle bucket
(`minio-init` / kebijakan ILM di deploy) — objek tanpa baris `media.url` setelah
TTL dapat dihapus operator; konfirmasi mengisi `url` permanen.
"""
from __future__ import annotations

from datetime import timedelta
from functools import lru_cache

import anyio
from minio import Minio
from minio.error import S3Error

from .konfig import konfig

_PRESIGN_DETIK = 600


class PenyimpananObjekMinio:
    def __init__(self) -> None:
        cfg = konfig()
        self._bucket = cfg.MINIO_BUCKET
        self._client = Minio(
            cfg.MINIO_ENDPOINT,
            access_key=cfg.MINIO_ROOT_USER,
            secret_key=cfg.MINIO_ROOT_PASSWORD,
            secure=cfg.MINIO_SECURE,
        )

    async def presign_put(self, objek: str) -> str:
        def _presign() -> str:
            return self._client.presigned_put_object(
                self._bucket,
                objek,
                expires=timedelta(seconds=_PRESIGN_DETIK),
            )

        return await anyio.to_thread.run_sync(_presign)

    async def ada(self, objek: str) -> bool:
        def _stat() -> bool:
            try:
                self._client.stat_object(self._bucket, objek)
                return True
            except S3Error:
                return False

        return await anyio.to_thread.run_sync(_stat)

    async def hapus(self, objek: str) -> None:
        def _remove() -> None:
            try:
                self._client.remove_object(self._bucket, objek)
            except S3Error:
                pass

        await anyio.to_thread.run_sync(_remove)


@lru_cache
def penyimpanan_objek() -> PenyimpananObjekMinio:
    return PenyimpananObjekMinio()


def url_publik_objek(objek: str) -> str:
    """URL akses publik objek (bucket anonymous download di compose B0)."""
    cfg = konfig()
    if cfg.MINIO_PUBLIC_BASE_URL:
        return f"{cfg.MINIO_PUBLIC_BASE_URL.rstrip('/')}/{objek}"
    skema = "https" if cfg.MINIO_SECURE else "http"
    return f"{skema}://{cfg.MINIO_ENDPOINT}/{cfg.MINIO_BUCKET}/{objek}"
