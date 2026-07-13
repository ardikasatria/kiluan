"""Seed akun demo — satu akun per peran UI (Teluk Kiluan).

Kata sandi default: ``demo-kiluan`` (override via env ``DEMO_SANDI_AWAL``).
Admin platform sudah ada di migrasi bootstrap (``admin@kiluan.local``).
"""
from __future__ import annotations

import os
from typing import Any
from uuid import UUID

DESA_SLUG = "teluk-kiluan"
DEMO_SANDI_DEFAULT = "demo-kiluan"

# UUID tetap agar migrasi idempotent (ON CONFLICT DO NOTHING).
DEMO_WISATAWAN_ID = UUID("22222222-2222-4222-8222-222222220001")
DEMO_KONTRIBUTOR_ID = UUID("22222222-2222-4222-8222-222222220002")
DEMO_PERANGKAT_ID = UUID("22222222-2222-4222-8222-222222220003")
DEMO_UMKM_ID = UUID("22222222-2222-4222-8222-222222220004")
DEMO_AGEN_ID = UUID("22222222-2222-4222-8222-222222220005")
DEMO_ORGANISASI_ID = UUID("22222222-2222-4222-8222-222222220006")

KEANGGOTAAN_WISATAWAN_ID = UUID("33333333-3333-4333-8333-333333330001")
KEANGGOTAAN_KONTRIBUTOR_ID = UUID("33333333-3333-4333-8333-333333330002")
KEANGGOTAAN_PERANGKAT_ID = UUID("33333333-3333-4333-8333-333333330003")
KEANGGOTAAN_UMKM_ID = UUID("33333333-3333-4333-8333-333333330004")
KEANGGOTAAN_AGEN_ID = UUID("33333333-3333-4333-8333-333333330005")
KEANGGOTAAN_ORGANISASI_ID = UUID("33333333-3333-4333-8333-333333330006")

DEMO_UMKM_ENTITAS_ID = UUID("44444444-4444-4444-8444-444444440001")

# peran_id konsisten dengan seed bootstrap 0001 / PERAN_ID di model.tabel
DEMO_AKUN: list[dict[str, Any]] = [
    {
        "id": DEMO_WISATAWAN_ID,
        "keanggotaan_id": KEANGGOTAAN_WISATAWAN_ID,
        "email": "demo-wisatawan@kiluan.local",
        "nama": "Demo Wisatawan",
        "peran_id": 1,
        "scoped_desa": False,
    },
    {
        "id": DEMO_KONTRIBUTOR_ID,
        "keanggotaan_id": KEANGGOTAAN_KONTRIBUTOR_ID,
        "email": "demo-kontributor@kiluan.local",
        "nama": "Demo Kontributor",
        "peran_id": 5,
        "scoped_desa": True,
    },
    {
        "id": DEMO_PERANGKAT_ID,
        "keanggotaan_id": KEANGGOTAAN_PERANGKAT_ID,
        "email": "demo-perangkat@kiluan.local",
        "nama": "Demo Perangkat Desa",
        "peran_id": 7,
        "scoped_desa": True,
    },
    {
        "id": DEMO_UMKM_ID,
        "keanggotaan_id": KEANGGOTAAN_UMKM_ID,
        "email": "demo-umkm@kiluan.local",
        "nama": "Demo UMKM",
        "peran_id": 3,
        "scoped_desa": True,
    },
    {
        "id": DEMO_AGEN_ID,
        "keanggotaan_id": KEANGGOTAAN_AGEN_ID,
        "email": "demo-agen@kiluan.local",
        "nama": "Demo Agen Lokal",
        "peran_id": 4,
        "scoped_desa": True,
    },
    {
        "id": DEMO_ORGANISASI_ID,
        "keanggotaan_id": KEANGGOTAAN_ORGANISASI_ID,
        "email": "demo-organisasi@kiluan.local",
        "nama": "Demo Organisasi",
        "peran_id": 6,
        "scoped_desa": True,
    },
]


def sandi_demo() -> str:
    return os.environ.get("DEMO_SANDI_AWAL", DEMO_SANDI_DEFAULT)


def hash_sandi_demo() -> str:
    try:
        from argon2 import PasswordHasher

        return PasswordHasher().hash(sandi_demo())
    except Exception:  # pragma: no cover
        from app.domain.keamanan import hash_sandi

        return hash_sandi(sandi_demo())
