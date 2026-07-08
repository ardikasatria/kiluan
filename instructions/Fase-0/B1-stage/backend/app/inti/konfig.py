"""Konfigurasi aplikasi dari environment (Pydantic Settings)."""
from __future__ import annotations

from functools import lru_cache

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

    # Auth
    JWT_SECRET: str = "ganti-di-produksi"
    AKSES_UMUR_DETIK: int = 900

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

    # Seed
    ADMIN_EMAIL: str = "admin@kiluan.local"
    ADMIN_SANDI_AWAL: str = "ubah-saya"


@lru_cache
def konfig() -> Konfig:
    return Konfig()
