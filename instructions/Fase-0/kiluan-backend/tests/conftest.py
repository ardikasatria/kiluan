"""Fixtures & factory untuk uji F0 (semua in-memory, tanpa DB)."""
from __future__ import annotations

from uuid import UUID

import pytest

from app.domain import entitas as E
from app.domain.enums import KodePeran, StatusDesa, StatusKeanggotaan, StatusPengguna
from app.domain.konteks import Konteks, bangun_konteks
from app.domain.keamanan import hash_sandi
from app.layanan.auth import AuthLayanan
from app.layanan.destinasi import DestinasiLayanan
from app.layanan.keanggotaan import KeanggotaanLayanan
from app.layanan.media import MediaLayanan
from app.repo.memori import Penyimpanan


@pytest.fixture
def store() -> Penyimpanan:
    s = Penyimpanan()
    s.kategori.tambah(E.Kategori(kode="snorkeling", nama="Snorkeling"))  # id=1
    s.kategori.tambah(E.Kategori(kode="pantai", nama="Pantai"))          # id=2
    return s


@pytest.fixture
def desa(store) -> E.Desa:
    return store.desa.tambah(
        E.Desa(slug="teluk-kiluan", nama="Teluk Kiluan", status=StatusDesa.aktif,
               lokasi=(-5.7912, 105.1033))
    )


@pytest.fixture
def desa_lain(store) -> E.Desa:
    return store.desa.tambah(
        E.Desa(slug="pahawang", nama="Pulau Pahawang", status=StatusDesa.aktif)
    )


# --- factory ---

def buat_pengguna(store, email="a@contoh.id", status=StatusPengguna.aktif) -> E.Pengguna:
    return store.pengguna.tambah(
        E.Pengguna(email=email, nama="Uji", kata_sandi_hash=hash_sandi("rahasia123"), status=status)
    )


def beri_peran(store, pengguna_id, peran: KodePeran, desa_id=None,
               status=StatusKeanggotaan.aktif) -> E.Keanggotaan:
    return store.keanggotaan.tambah(
        E.Keanggotaan(pengguna_id=pengguna_id, peran=peran, desa_id=desa_id, status=status)
    )


def konteks_untuk(store, pengguna_id) -> Konteks:
    return bangun_konteks(store, pengguna_id)


@pytest.fixture
def auth(store) -> AuthLayanan:
    return AuthLayanan(store)


@pytest.fixture
def svc_destinasi(store) -> DestinasiLayanan:
    return DestinasiLayanan(store)


@pytest.fixture
def svc_keanggotaan(store) -> KeanggotaanLayanan:
    return KeanggotaanLayanan(store)


@pytest.fixture
def svc_media(store) -> MediaLayanan:
    return MediaLayanan(store)
