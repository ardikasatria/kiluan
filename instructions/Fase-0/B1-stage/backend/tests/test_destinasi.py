"""Gerbang destinasi (async): unik, soft delete, publik vs kelola, validasi."""
import pytest

from app.domain.enums import KodePeran, StatusKonten
from app.domain.errors import Konflik, TidakDitemukan
from app.domain.konteks import Konteks
from app.skema.destinasi import DestinasiBuat
from conftest import beri_peran, buat_pengguna, konteks_untuk


async def _pengelola(store, desa):
    p = await buat_pengguna(store)
    await beri_peran(store, p.id, KodePeran.pokdarwis, desa_id=desa.id)
    return await konteks_untuk(store, p.id)


def _data(slug, status=StatusKonten.publikasi):
    return DestinasiBuat(nama="Spot", slug=slug, kategori_id=1,
                         lokasi={"lat": -5.7, "lng": 105.1}, status=status)


async def test_slug_unik_per_desa(store, desa, svc_destinasi):
    k = await _pengelola(store, desa)
    await svc_destinasi.buat(k, desa.id, _data("gigi-hiu"))
    with pytest.raises(Konflik):
        await svc_destinasi.buat(k, desa.id, _data("gigi-hiu"))


async def test_soft_delete_sembunyi_dari_publik(store, desa, svc_destinasi):
    k = await _pengelola(store, desa)
    d = await svc_destinasi.buat(k, desa.id, _data("laguna"))
    await svc_destinasi.hapus(k, desa.id, d.id)
    with pytest.raises(TidakDitemukan):
        await svc_destinasi.detail(Konteks(), desa.id, d.id)
    assert (await svc_destinasi.cari(Konteks(), desa.id))["item"] == []


async def test_draft_hanya_terlihat_pengelola(store, desa, svc_destinasi):
    k = await _pengelola(store, desa)
    d = await svc_destinasi.buat(k, desa.id, _data("draf-spot", status=StatusKonten.draft))
    assert (await svc_destinasi.cari(Konteks(), desa.id))["item"] == []
    with pytest.raises(TidakDitemukan):
        await svc_destinasi.detail(Konteks(), desa.id, d.id)
    assert len((await svc_destinasi.cari(k, desa.id))["item"]) == 1
    assert (await svc_destinasi.detail(k, desa.id, d.id)).id == d.id


def test_validasi_lokasi_pydantic():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        DestinasiBuat(nama="X", slug="x", kategori_id=1, lokasi={"lat": 999, "lng": 0})


def test_validasi_slug_pydantic():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        DestinasiBuat(nama="X", slug="Spot Salah!", kategori_id=1, lokasi={"lat": 0, "lng": 0})
