"""Gerbang auth lifecycle (Kontrak API F0 §9) — async."""
import pytest

from app.domain.enums import StatusPengguna
from app.domain.errors import Konflik, KesalahanValidasi, TidakBerwenang, TidakTerautentikasi
from app.skema.destinasi import DaftarReq, MasukReq


async def _daftar_dan_verifikasi(auth, email="budi@contoh.id"):
    p, token = await auth.daftar(DaftarReq(email=email, nama="Budi", kata_sandi="rahasia123"))
    assert p.status == StatusPengguna.pending
    await auth.verifikasi_email(token)
    return p


async def test_siklus_lengkap(auth):
    p = await _daftar_dan_verifikasi(auth)
    assert (await auth.store.pengguna.ambil(p.id)).status == StatusPengguna.aktif

    sesi = await auth.masuk(MasukReq(email="budi@contoh.id", kata_sandi="rahasia123"))
    assert sesi["access_token"] and sesi["refresh_token"]

    baru = await auth.segarkan(sesi["refresh_token"])
    assert baru["refresh_token"] != sesi["refresh_token"]

    await auth.keluar(baru["refresh_token"])
    with pytest.raises(TidakTerautentikasi):
        await auth.segarkan(baru["refresh_token"])


async def test_reuse_refresh_mencabut_semua_sesi(auth):
    await _daftar_dan_verifikasi(auth)
    sesi = await auth.masuk(MasukReq(email="budi@contoh.id", kata_sandi="rahasia123"))
    baru = await auth.segarkan(sesi["refresh_token"])
    with pytest.raises(TidakTerautentikasi):
        await auth.segarkan(sesi["refresh_token"])   # reuse token lama
    with pytest.raises(TidakTerautentikasi):
        await auth.segarkan(baru["refresh_token"])   # sesi rotasi ikut dicabut


async def test_masuk_sebelum_verifikasi_ditolak(auth):
    await auth.daftar(DaftarReq(email="c@contoh.id", nama="C", kata_sandi="rahasia123"))
    with pytest.raises(TidakBerwenang):
        await auth.masuk(MasukReq(email="c@contoh.id", kata_sandi="rahasia123"))


async def test_email_duplikat_konflik(auth):
    await auth.daftar(DaftarReq(email="d@contoh.id", nama="D", kata_sandi="rahasia123"))
    with pytest.raises(Konflik):
        await auth.daftar(DaftarReq(email="d@contoh.id", nama="D2", kata_sandi="rahasia123"))


async def test_token_verifikasi_sekali_pakai(auth):
    _, token = await auth.daftar(DaftarReq(email="e@contoh.id", nama="E", kata_sandi="rahasia123"))
    await auth.verifikasi_email(token)
    with pytest.raises(KesalahanValidasi):
        await auth.verifikasi_email(token)


async def test_kredensial_salah(auth):
    await _daftar_dan_verifikasi(auth, email="f@contoh.id")
    with pytest.raises(TidakTerautentikasi):
        await auth.masuk(MasukReq(email="f@contoh.id", kata_sandi="salah-sekali"))


async def test_reset_sandi(auth):
    await _daftar_dan_verifikasi(auth, email="g@contoh.id")
    token = await auth.lupa_sandi("g@contoh.id")
    await auth.reset_sandi(token, "sandiBaru123")
    sesi = await auth.masuk(MasukReq(email="g@contoh.id", kata_sandi="sandiBaru123"))
    assert sesi["access_token"]


async def test_lupa_sandi_email_tak_ada_tak_bocor(auth):
    assert await auth.lupa_sandi("tidak-ada@contoh.id") is None
