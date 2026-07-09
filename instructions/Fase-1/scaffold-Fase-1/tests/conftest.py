"""Fixtures uji F1 (in-memory, async)."""
from __future__ import annotations

from uuid import UUID, uuid4

import pytest
import pytest_asyncio

from kiluan_f1.ids import uid
from kiluan_f1.konteks import Aktor, PeranAktif, buat_aktor
from kiluan_f1.models import Destinasi
from kiluan_f1.wiring import Aplikasi, bangun_aplikasi


@pytest_asyncio.fixture
async def app() -> Aplikasi:
    return await bangun_aplikasi()


DESA_A = UUID("00000000-0000-4000-8000-000000000001")
DESA_B = UUID("00000000-0000-4000-8000-000000000002")
USER_UMKM = UUID("00000000-0000-4000-8000-000000000010")
USER_AGEN = UUID("00000000-0000-4000-8000-000000000011")
USER_AGEN2 = UUID("00000000-0000-4000-8000-000000000012")
USER_WARGA = UUID("00000000-0000-4000-8000-000000000013")
USER_POKDARWIS = UUID("00000000-0000-4000-8000-000000000014")


def aktor_umkm() -> Aktor:
    return buat_aktor(USER_UMKM, DESA_A, "umkm")


def aktor_agen() -> Aktor:
    return buat_aktor(USER_AGEN, DESA_A, "agen")


def aktor_agen2() -> Aktor:
    return buat_aktor(USER_AGEN2, DESA_A, "agen")


def aktor_warga() -> Aktor:
    return buat_aktor(USER_WARGA, DESA_A, "wisatawan")


def aktor_pokdarwis() -> Aktor:
    return buat_aktor(USER_POKDARWIS, DESA_A, "pokdarwis")


async def buat_umkm_terverifikasi(app: Aplikasi, pengguna=USER_UMKM) -> tuple:
    aktor = Aktor(pengguna_id=pengguna, keanggotaan=[PeranAktif(DESA_A, "umkm")])
    umkm = await app.umkm.daftar(aktor, DESA_A, {"bidang_id": 1, "nama": "Kopi Kiluan"})
    await app.umkm.verifikasi(aktor_pokdarwis(), DESA_A, umkm.id, "terverifikasi")
    return aktor, umkm


async def buat_destinasi(app: Aplikasi, desa_id=DESA_A) -> Destinasi:
    d = Destinasi(desa_id=desa_id, nama="Laguna", slug="laguna")
    return await app.repo_destinasi.simpan(d)
