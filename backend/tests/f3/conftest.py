"""Fixtures uji F3 — in-memory."""
from __future__ import annotations

from datetime import date

import pytest
import pytest_asyncio

from app.domain.entitas import Desa, Keanggotaan, Pengguna
from app.domain.enums import KodePeran, StatusDesa, StatusKeanggotaan
from app.domain.keamanan import hash_sandi
from app.domain.konteks import Konteks, PeranAktif
from app.layanan.dana_konservasi import DanaKonservasiLayanan
from app.layanan.monitoring import MonitoringLayanan
from app.model import tabel as M
from app.repo.memori import Penyimpanan

TGL = date(2026, 6, 15)


@pytest_asyncio.fixture
async def store() -> Penyimpanan:
    return Penyimpanan()


@pytest_asyncio.fixture
async def desa(store) -> Desa:
    return await store.desa.tambah(
        Desa(slug="uji-lestari", nama="Uji", status=StatusDesa.aktif),
    )


@pytest_asyncio.fixture
async def desa_id(desa):
    return desa.id


@pytest_asyncio.fixture
async def pencatat_id(store) -> object:
    p = await store.pengguna.tambah(
        Pengguna(email="pencatat@uji.id", nama="Pencatat", kata_sandi_hash=hash_sandi("x")),
    )
    return p.id


@pytest_asyncio.fixture
async def konteks_pencatat(store, desa_id, pencatat_id) -> Konteks:
    await store.keanggotaan.tambah(
        Keanggotaan(
            pengguna_id=pencatat_id, peran=KodePeran.kontributor,
            desa_id=desa_id, status=StatusKeanggotaan.aktif,
        ),
    )
    return Konteks(
        pengguna_id=pencatat_id,
        keanggotaan=[PeranAktif(desa_id=desa_id, peran=KodePeran.kontributor)],
    )


@pytest_asyncio.fixture
async def indikator_mangrove(store):
    ind = M.IndikatorEkologi(
        id=0, desa_id=None, kode="mangrove_survival", nama="Sintasan Mangrove",
        satuan="%", arah_baik="naik", aktif=True,
    )
    return await store.indikator.simpan(ind)


@pytest_asyncio.fixture
def svc_mon(store) -> MonitoringLayanan:
    return MonitoringLayanan(store)


@pytest_asyncio.fixture
def svc_dana(store) -> DanaKonservasiLayanan:
    return DanaKonservasiLayanan(store)


@pytest_asyncio.fixture
async def konteks_pengelola(store, desa_id, pencatat_id) -> Konteks:
    await store.keanggotaan.tambah(
        Keanggotaan(
            pengguna_id=pencatat_id, peran=KodePeran.perangkat_desa,
            desa_id=desa_id, status=StatusKeanggotaan.aktif,
        ),
    )
    return Konteks(
        pengguna_id=pencatat_id,
        keanggotaan=[PeranAktif(desa_id=desa_id, peran=KodePeran.perangkat_desa)],
    )
