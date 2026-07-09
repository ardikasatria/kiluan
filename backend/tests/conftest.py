"""Fixtures & factory untuk uji F0 (async, in-memory, tanpa DB)."""
from __future__ import annotations

import pytest
import pytest_asyncio

from app.domain import entitas as E
from app.domain.enums import KodePeran, StatusDesa, StatusKeanggotaan, StatusPengguna
from app.domain.keamanan import hash_sandi
from app.domain.konteks import Konteks, bangun_konteks
from app.layanan.auth import AuthLayanan
from app.layanan.destinasi import DestinasiLayanan
from app.layanan.keanggotaan import KeanggotaanLayanan
from app.layanan.media import MediaLayanan
from app.repo.memori import Penyimpanan


@pytest_asyncio.fixture
async def store() -> Penyimpanan:
    s = Penyimpanan()
    await s.kategori.tambah(E.Kategori(kode="snorkeling", nama="Snorkeling"))  # id=1
    await s.kategori.tambah(E.Kategori(kode="pantai", nama="Pantai"))          # id=2
    return s


@pytest_asyncio.fixture
async def desa(store) -> E.Desa:
    return await store.desa.tambah(
        E.Desa(slug="teluk-kiluan", nama="Teluk Kiluan", status=StatusDesa.aktif,
               lokasi=(-5.7912, 105.1033))
    )


@pytest_asyncio.fixture
async def desa_lain(store) -> E.Desa:
    return await store.desa.tambah(
        E.Desa(slug="pahawang", nama="Pulau Pahawang", status=StatusDesa.aktif)
    )


# --- factory (async) ---

async def buat_pengguna(store, email="a@contoh.id", status=StatusPengguna.aktif) -> E.Pengguna:
    return await store.pengguna.tambah(
        E.Pengguna(email=email, nama="Uji", kata_sandi_hash=hash_sandi("rahasia123"), status=status)
    )


async def beri_peran(store, pengguna_id, peran: KodePeran, desa_id=None,
                     status=StatusKeanggotaan.aktif) -> E.Keanggotaan:
    return await store.keanggotaan.tambah(
        E.Keanggotaan(pengguna_id=pengguna_id, peran=peran, desa_id=desa_id, status=status)
    )


async def konteks_untuk(store, pengguna_id) -> Konteks:
    return await bangun_konteks(store, pengguna_id)


@pytest_asyncio.fixture
async def auth(store) -> AuthLayanan:
    return AuthLayanan(store)


@pytest_asyncio.fixture
async def svc_destinasi(store) -> DestinasiLayanan:
    return DestinasiLayanan(store)


@pytest_asyncio.fixture
async def svc_keanggotaan(store) -> KeanggotaanLayanan:
    return KeanggotaanLayanan(store)


@pytest_asyncio.fixture
async def svc_media(store) -> MediaLayanan:
    return MediaLayanan(store)


# --- F2 (scaffold domain, repo in-memory) ---

@pytest.fixture
def f2_app():
    from app.f2.fabrik import App
    return App()


@pytest_asyncio.fixture
async def f2_dunia(f2_app):
    from app.f2.fabrik import seed
    ctx = await seed(f2_app)
    ctx["app"] = f2_app
    return ctx


@pytest.fixture
def app(f2_app):
    """Alias untuk uji F2 (hindari konflik conftest subfolder)."""
    return f2_app


@pytest_asyncio.fixture
async def dunia(f2_dunia):
    return f2_dunia

