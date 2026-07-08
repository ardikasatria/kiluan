"""Konfigurasi aplikasi dari environment (Pydantic Settings)."""
from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Konfig(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    nama_platform: str = "kiluanciv"
    domain: str = "kiluanapi.sainsdataciv.com"
    frontend_domain: str = "kiluan.sainsdataciv.com"

    DATABASE_URL: str = "postgresql+asyncpg://kiluan:kiluan@db:5432/kiluan"
    DATABASE_URL_SYNC: str = "postgresql+psycopg://kiluan:kiluan@db:5432/kiluan"

    REDIS_URL: str = "redis://redis:6379/0"
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ROOT_USER: str = "kiluan"
    MINIO_ROOT_PASSWORD: str = "kiluan"
    MINIO_BUCKET: str = "kiluan"

    JWT_SECRET: str = "ganti-di-produksi"
    AKSES_UMUR_DETIK: int = 900

    ADMIN_EMAIL: str = "admin@kiluan.local"
    ADMIN_SANDI_AWAL: str = "ubah-saya"

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://kiluan.sainsdataciv.com",
        "http://kiluan.sainsdataciv.com",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors(cls, nilai: str | list[str]) -> list[str]:
        if isinstance(nilai, str):
            return [item.strip() for item in nilai.split(",") if item.strip()]
        return nilai


@lru_cache
def konfig() -> Konfig:
    return Konfig()


# Alias kompatibilitas sementara untuk modul yang masih memakai nama lama.
def pengaturan() -> Konfig:
    return konfig()
