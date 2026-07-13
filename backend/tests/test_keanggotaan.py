"""Gerbang keanggotaan: revisi/submission ulang."""
import pytest

from app.domain.enums import KodePeran, StatusKeanggotaan
from app.domain.errors import Konflik
from tests.conftest import beri_peran, buat_pengguna, konteks_untuk


@pytest.mark.asyncio
async def test_keanggotaan_ditolak_bisa_submit_ulang(store, desa, svc_keanggotaan):
    pengguna = await buat_pengguna(store, email="umkm-reapply@x.id")
    await beri_peran(store, pengguna.id, KodePeran.wisatawan)
    pengelola = await buat_pengguna(store, email="pok-reapply@x.id")
    await beri_peran(store, pengelola.id, KodePeran.kontributor, desa_id=desa.id)

    k_pengguna = await konteks_untuk(store, pengguna.id)
    k_pengelola = await konteks_untuk(store, pengelola.id)

    awal = await svc_keanggotaan.ajukan(k_pengguna, desa.id, KodePeran.umkm)
    await svc_keanggotaan.putuskan(k_pengelola, desa.id, awal.id, StatusKeanggotaan.ditolak)

    ulang = await svc_keanggotaan.ajukan(k_pengguna, desa.id, KodePeran.umkm)

    assert ulang.id == awal.id
    assert ulang.status == StatusKeanggotaan.menunggu


@pytest.mark.asyncio
async def test_keanggotaan_revisi_bisa_submit_ulang(store, desa, svc_keanggotaan):
    pengguna = await buat_pengguna(store, email="agen-revisi@x.id")
    await beri_peran(store, pengguna.id, KodePeran.wisatawan)
    pengelola = await buat_pengguna(store, email="pok-revisi@x.id")
    await beri_peran(store, pengelola.id, KodePeran.kontributor, desa_id=desa.id)

    k_pengguna = await konteks_untuk(store, pengguna.id)
    k_pengelola = await konteks_untuk(store, pengelola.id)

    awal = await svc_keanggotaan.ajukan(k_pengguna, desa.id, KodePeran.agen)
    await svc_keanggotaan.putuskan(k_pengelola, desa.id, awal.id, StatusKeanggotaan.revisi)

    ulang = await svc_keanggotaan.ajukan(k_pengguna, desa.id, KodePeran.agen)

    assert ulang.id == awal.id
    assert ulang.status == StatusKeanggotaan.menunggu


@pytest.mark.asyncio
async def test_keanggotaan_menunggu_tetap_konflik(store, desa, svc_keanggotaan):
    pengguna = await buat_pengguna(store, email="umkm-pending@x.id")
    await beri_peran(store, pengguna.id, KodePeran.wisatawan)
    k_pengguna = await konteks_untuk(store, pengguna.id)

    await svc_keanggotaan.ajukan(k_pengguna, desa.id, KodePeran.umkm)

    with pytest.raises(Konflik):
        await svc_keanggotaan.ajukan(k_pengguna, desa.id, KodePeran.umkm)
