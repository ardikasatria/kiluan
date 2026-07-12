import pytest

from app.domain.seed_penjelajah import (
    DESA_SLUG,
    KODE_MISI_AKSI_LUMBA,
    KODE_MISI_BELAJAR_LUMBA,
    MISI,
    QR_DERMAGA,
    STASIUN,
)


def test_seed_penjelajah_stasiun_lengkap():
    assert len(STASIUN) >= 3
    for st in STASIUN:
        assert st["qr_token"].startswith("STN-")
        assert st["radius_m"] > 0
        assert -90 <= st["lat"] <= 90
        assert -180 <= st["lng"] <= 180


def test_seed_penjelajah_misi_gating():
    belajar_kat = {m["kategori"] for m in MISI if m["jenis"] == "belajar"}
    aksi_kat = {m["kategori"] for m in MISI if m["jenis"] == "aksi"}
    assert belajar_kat.issuperset(aksi_kat)
    for m in MISI:
        if m["jenis"] == "belajar":
            assert m["micro_lesson"]
            assert m["syarat_verifikasi"]["metode"] == "otomatis"
        if m["jenis"] == "aksi":
            assert m["syarat_verifikasi"]["metode"] in (
                "qr_checkin",
                "foto_geotag",
                "konfirmasi_pemandu",
            )


def test_seed_penjelajah_kode_unik():
    kodes = [m["kode"] for m in MISI]
    assert len(kodes) == len(set(kodes))


def test_seed_penjelajah_lumba_pair():
    assert KODE_MISI_BELAJAR_LUMBA == "BL-LUMBA-01"
    assert KODE_MISI_AKSI_LUMBA == "AK-LUMBA-01"
    assert QR_DERMAGA == "STN-KILUAN-DERMAGA"
    assert DESA_SLUG == "teluk-kiluan"
