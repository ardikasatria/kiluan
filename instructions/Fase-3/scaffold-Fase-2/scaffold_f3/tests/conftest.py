"""Fixtures F3 — wiring domain in-memory tanpa DB, jam terkontrol."""
from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest

from app.enums import ArahBaik
from app.layanan_agregat import LayananAgregat
from app.layanan_dana import LayananDana
from app.layanan_kapasitas import LayananKapasitas
from app.layanan_laporan import LayananLaporan
from app.layanan_monitoring import LayananMonitoring
from app.layanan_neraca import LayananNeraca
from app.model import IndikatorEkologi
from app.repo import RepoMemori
from app.util import Jam


@pytest.fixture
def jam():
    return Jam(datetime(2026, 6, 15, tzinfo=timezone.utc))


@pytest.fixture
def desa_a():
    return uuid4()


@pytest.fixture
def desa_b():
    return uuid4()


@pytest.fixture
def repos():
    return {
        "monitoring": RepoMemori(lambda m: m.id, lambda m: m.desa_id),
        "indikator": RepoMemori(lambda i: i.id, lambda i: i.desa_id),
        "verifikasi": RepoMemori(lambda v: v.id, lambda v: v.desa_id),
        "peristiwa": RepoMemori(lambda p: p.id, lambda p: p.desa_id),
        "dana": RepoMemori(lambda d: d.id, lambda d: d.desa_id),
        "daya_dukung": RepoMemori(lambda d: d.id, lambda d: d.desa_id),
        "pemakaian": RepoMemori(lambda p: p.id, lambda p: p.desa_id),
        "agregat": RepoMemori(lambda a: a.id, lambda a: a.desa_id),
        "job": RepoMemori(lambda j: j.id, lambda j: j.desa_id),
        "neraca": RepoMemori(lambda n: n.id, lambda n: n.desa_id),
        "transaksi": RepoMemori(lambda t: t.id, lambda t: t.desa_id),
        "stempel": RepoMemori(lambda s: s.id, lambda s: s.desa_id),
        "laporan": RepoMemori(lambda l: l.id, lambda l: l.desa_id),
    }


@pytest.fixture
def svc(repos, jam):
    return {
        "monitoring": LayananMonitoring(repos["monitoring"], repos["indikator"],
                                        repos["verifikasi"], repos["peristiwa"], jam),
        "dana": LayananDana(repos["dana"], jam),
        "kapasitas": LayananKapasitas(repos["daya_dukung"], repos["pemakaian"], jam),
        "agregat": LayananAgregat(repos["peristiwa"], repos["agregat"], repos["job"], jam),
        "neraca": LayananNeraca(repos["neraca"], repos["monitoring"], repos["indikator"],
                                repos["transaksi"], repos["stempel"], jam),
        "laporan": LayananLaporan(repos["laporan"], jam),
    }


@pytest.fixture
async def indikator_mangrove(repos, desa_a):
    ind = IndikatorEkologi(id=1, desa_id=desa_a, kode="mangrove_survival",
                           nama="Sintasan Mangrove", satuan="%", arah_baik=ArahBaik.naik)
    await repos["indikator"].simpan(ind)
    return ind


@pytest.fixture
async def indikator_karang(repos, desa_a):
    ind = IndikatorEkologi(id=2, desa_id=desa_a, kode="kesehatan_karang",
                           nama="Kesehatan Karang", satuan="%", arah_baik=ArahBaik.naik)
    await repos["indikator"].simpan(ind)
    return ind


PERIODE = "2026-06"
TGL = date(2026, 6, 15)
