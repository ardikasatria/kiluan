"""Gerbang isolasi tenant (Kontrak API F0 §9) — async. Lintas-tenant = 404."""
import pytest

from app.domain.enums import KodePeran, StatusKonten
from app.domain.errors import TidakDitemukan
from app.domain.konteks import Konteks
from app.skema.destinasi import DestinasiBuat, DestinasiUbah
from conftest import beri_peran, buat_pengguna, konteks_untuk


async def _buat(store, svc, desa_id, pengelola_id, slug):
    await beri_peran(store, pengelola_id, KodePeran.pokdarwis, desa_id=desa_id)
    return await svc.buat(
        await konteks_untuk(store, pengelola_id), desa_id,
        DestinasiBuat(nama="X", slug=slug, kategori_id=1,
                      lokasi={"lat": -5.7, "lng": 105.1}, status=StatusKonten.publikasi),
    )


async def test_kelola_resource_desa_lain_404(store, desa, desa_lain, svc_destinasi):
    pengelola_b = await buat_pengguna(store, email="b@contoh.id")
    d_b = await _buat(store, svc_destinasi, desa_lain.id, pengelola_b.id, "spot-b")

    pokdarwis_a = await buat_pengguna(store, email="a@contoh.id")
    await beri_peran(store, pokdarwis_a.id, KodePeran.pokdarwis, desa_id=desa.id)
    with pytest.raises(TidakDitemukan):
        await svc_destinasi.ubah(await konteks_untuk(store, pokdarwis_a.id), desa.id, d_b.id,
                                 DestinasiUbah(nama="Ubah"))


async def test_cari_terfilter_desa(store, desa, desa_lain, svc_destinasi):
    pa = await buat_pengguna(store, email="pa@contoh.id")
    pb = await buat_pengguna(store, email="pb@contoh.id")
    await _buat(store, svc_destinasi, desa.id, pa.id, "a1")
    await _buat(store, svc_destinasi, desa_lain.id, pb.id, "b1")

    hasil = await svc_destinasi.cari(Konteks(), desa.id)
    ids = {i["destinasi"].desa_id for i in hasil["item"]}
    assert ids == {desa.id}


async def test_detail_slug_dalam_scope_desa(store, desa, desa_lain, svc_destinasi):
    pa = await buat_pengguna(store, email="pa@contoh.id")
    d = await _buat(store, svc_destinasi, desa.id, pa.id, "sama")
    with pytest.raises(TidakDitemukan):
        await svc_destinasi.detail(Konteks(), desa_lain.id, "sama")
    ok = await svc_destinasi.detail(Konteks(), desa.id, "sama")
    assert ok.id == d.id
