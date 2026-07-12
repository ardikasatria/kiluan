"""Adapter MinIO async — presigned PUT & verifikasi objek.

Antarmuka sama dengan `ObjectStorePalsu` di `repo/memori.py` agar `MediaLayanan`
tetap teruji in-memory tanpa MinIO nyata.

File yatim (di-PUT tapi tak dikonfirmasi) dibersihkan via lifecycle bucket
(`minio-init` / kebijakan ILM di deploy) — objek tanpa baris `media.url` setelah
TTL dapat dihapus operator; konfirmasi mengisi `url` permanen.

Produksi (Caddy `https://api…/media/*` → MinIO):
- Koneksi stat/hapus via endpoint internal HTTP (`minio:9000`).
- Presign ditandatangani untuk host publik API; prefix `/media` disisipkan agar
  browser PUT ke URL yang sama dengan proxy Caddy (path canonical MinIO tetap
  `/{bucket}/{objek}` setelah strip prefix).
"""
from __future__ import annotations

from datetime import timedelta
from functools import lru_cache
from urllib.parse import urlparse, urlunparse

import anyio
from minio import Minio
from minio.error import S3Error

from .konfig import konfig

_PRESIGN_DETIK = 600


def _parse_public_base() -> tuple[str, bool, str] | None:
    """(host, secure, path_prefix) dari MINIO_PUBLIC_BASE_URL."""
    raw = konfig().MINIO_PUBLIC_BASE_URL.strip()
    if not raw:
        return None
    u = urlparse(raw)
    if not u.netloc:
        return None
    return u.netloc, u.scheme == "https", u.path.rstrip("/")


class PenyimpananObjekMinio:
    def __init__(self) -> None:
        cfg = konfig()
        self._bucket = cfg.MINIO_BUCKET
        self._public = _parse_public_base()
        self._client = Minio(
            cfg.MINIO_ENDPOINT,
            access_key=cfg.MINIO_ROOT_USER,
            secret_key=cfg.MINIO_ROOT_PASSWORD,
            secure=cfg.MINIO_INTERNAL_SECURE,
        )
        self._presign_client: Minio | None = None
        if self._public:
            host, secure, _ = self._public
            self._presign_client = Minio(
                host,
                access_key=cfg.MINIO_ROOT_USER,
                secret_key=cfg.MINIO_ROOT_PASSWORD,
                secure=secure,
            )

    def _sisipkan_prefix_publik(self, url: str) -> str:
        if not self._public:
            return url
        _, _, prefix = self._public
        if not prefix:
            return url
        u = urlparse(url)
        # /kiluan/objek → /media/kiluan/objek (Caddy strip /media sebelum proxy)
        return urlunparse((u.scheme, u.netloc, f"{prefix}{u.path}", u.params, u.query, u.fragment))

    async def presign_put(self, objek: str) -> str:
        def _presign() -> str:
            client = self._presign_client or self._client
            try:
                url = client.presigned_put_object(
                    self._bucket,
                    objek,
                    expires=timedelta(seconds=_PRESIGN_DETIK),
                )
            except S3Error as exc:
                raise RuntimeError(f"MinIO presign gagal: {exc}") from exc
            return self._sisipkan_prefix_publik(url)

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
    """URL akses publik objek (bucket anonymous download + proxy Caddy)."""
    cfg = konfig()
    if cfg.MINIO_PUBLIC_BASE_URL:
        return f"{cfg.MINIO_PUBLIC_BASE_URL.rstrip('/')}/{cfg.MINIO_BUCKET}/{objek}"
    skema = "https" if cfg.MINIO_SECURE else "http"
    return f"{skema}://{cfg.MINIO_ENDPOINT}/{cfg.MINIO_BUCKET}/{objek}"
