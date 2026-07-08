"""Konfigurasi aplikasi dari environment (Pydantic Settings)."""
from __future__ import annotations

from functools import lru_cache
import json

from pydantic_settings import BaseSettings, SettingsConfigDict


class Konfig(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # DB
    DATABASE_URL: str = "postgresql+asyncpg://kiluan:kiluan@db:5432/kiluan"
    DATABASE_URL_SYNC: str = "postgresql+psycopg://kiluan:kiluan@db:5432/kiluan"

    # Infra
    REDIS_URL: str = "redis://redis:6379/0"
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ROOT_USER: str = "kiluan"
    MINIO_ROOT_PASSWORD: str = "kiluan"
    MINIO_BUCKET: str = "kiluan"
    MINIO_SECURE: bool = False
    # Kosong = turunan dari endpoint + bucket (lihat inti/minio.url_publik_objek)
    MINIO_PUBLIC_BASE_URL: str = ""

    # Auth
    JWT_SECRET: str = "ganti-di-produksi"
    AKSES_UMUR_DETIK: int = 900

    # CORS & cookie (dev: COOKIE_SECURE=false agar refresh cookie jalan di http://localhost)
    #
    # NOTE: Env untuk list sering error (Pydantic mencoba JSON decode). Karena itu kita simpan
    # sebagai string CSV / JSON array, lalu diparse manual.
    CORS_ORIGINS: str = (
        "http://localhost:3000,"
        "https://kiluan.sainsdataciv.com,"
        "http://kiluan.sainsdataciv.com"
    )
    COOKIE_SECURE: bool = False

    def cors_origins(self) -> list[str]:
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw:
            return []

        # Terima format JSON array juga: ["http://a","https://b"]
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(x).strip() for x in parsed if str(x).strip()]
            except Exception:
                # Fall back ke CSV
                pass

        # CSV: a,b,c
        return [item.strip() for item in raw.split(",") if item.strip()]

    # Email — provider: dev | resend_api | resend_smtp
    EMAIL_PROVIDER: str = "dev"
    EMAIL_FROM: str = "Kiluan <no-reply@kiluan.sainsdataciv.com>"
    APP_BASE_URL: str = "http://localhost"
    RESEND_API_KEY: str = ""
    # Dipakai hanya bila EMAIL_PROVIDER=resend_smtp
    SMTP_HOST: str = "smtp.resend.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = "resend"
    SMTP_PASSWORD: str = ""  # = RESEND_API_KEY

    # Cuaca BMKG (read-only, cache-only, fail-soft)
    CUACA_AKTIF: bool = False
    CUACA_CACHE_TTL_DETIK: int = 10_800  # ~3 jam

    # Seed
    ADMIN_EMAIL: str = "admin@kiluan.local"
    ADMIN_SANDI_AWAL: str = "ubah-saya"


@lru_cache
def konfig() -> Konfig:
    return Konfig()
