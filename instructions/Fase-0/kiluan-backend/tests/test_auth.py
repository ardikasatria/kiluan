"""Gerbang auth lifecycle (Kontrak API F0 §9)."""
import pytest

from app.domain.enums import StatusPengguna
from app.domain.errors import Konflik, KesalahanValidasi, TidakBerwenang, TidakTerautentikasi
from app.skema.destinasi import DaftarReq, MasukReq


def _daftar_dan_verifikasi(auth, email="budi@contoh.id"):
    p, token = auth.daftar(DaftarReq(email=email, nama="Budi", kata_sandi="rahasia123"))
    assert p.status == StatusPengguna.pending
    auth.verifikasi_email(token)
    return p


def test_siklus_lengkap(auth):
    p = _daftar_dan_verifikasi(auth)
    assert auth.store.pengguna.ambil(p.id).status == StatusPengguna.aktif

    sesi = auth.masuk(MasukReq(email="budi@contoh.id", kata_sandi="rahasia123"))
    assert sesi["access_token"] and sesi["refresh_token"]

    # rotasi: refresh baru berbeda dari lama
    baru = auth.segarkan(sesi["refresh_token"])
    assert baru["refresh_token"] != sesi["refresh_token"]

    # keluar mencabut refresh terbaru
    auth.keluar(baru["refresh_token"])
    with pytest.raises(TidakTerautentikasi):
        auth.segarkan(baru["refresh_token"])


def test_reuse_refresh_mencabut_semua_sesi(auth):
    _daftar_dan_verifikasi(auth)
    sesi = auth.masuk(MasukReq(email="budi@contoh.id", kata_sandi="rahasia123"))
    baru = auth.segarkan(sesi["refresh_token"])          # token lama kini terpakai
    with pytest.raises(TidakTerautentikasi):
        auth.segarkan(sesi["refresh_token"])             # reuse token lama → dicabut semua
    # sesi hasil rotasi pun ikut mati
    with pytest.raises(TidakTerautentikasi):
        auth.segarkan(baru["refresh_token"])


def test_masuk_sebelum_verifikasi_ditolak(auth):
    auth.daftar(DaftarReq(email="c@contoh.id", nama="C", kata_sandi="rahasia123"))
    with pytest.raises(TidakBerwenang):
        auth.masuk(MasukReq(email="c@contoh.id", kata_sandi="rahasia123"))


def test_email_duplikat_konflik(auth):
    auth.daftar(DaftarReq(email="d@contoh.id", nama="D", kata_sandi="rahasia123"))
    with pytest.raises(Konflik):
        auth.daftar(DaftarReq(email="d@contoh.id", nama="D2", kata_sandi="rahasia123"))


def test_token_verifikasi_sekali_pakai(auth):
    _, token = auth.daftar(DaftarReq(email="e@contoh.id", nama="E", kata_sandi="rahasia123"))
    auth.verifikasi_email(token)
    with pytest.raises(KesalahanValidasi):
        auth.verifikasi_email(token)  # tak bisa dipakai dua kali


def test_kredensial_salah(auth):
    _daftar_dan_verifikasi(auth, email="f@contoh.id")
    with pytest.raises(TidakTerautentikasi):
        auth.masuk(MasukReq(email="f@contoh.id", kata_sandi="salah-sekali"))


def test_reset_sandi(auth):
    _daftar_dan_verifikasi(auth, email="g@contoh.id")
    token = auth.lupa_sandi("g@contoh.id")
    auth.reset_sandi(token, "sandiBaru123")
    sesi = auth.masuk(MasukReq(email="g@contoh.id", kata_sandi="sandiBaru123"))
    assert sesi["access_token"]


def test_lupa_sandi_email_tak_ada_tak_bocor(auth):
    assert auth.lupa_sandi("tidak-ada@contoh.id") is None
