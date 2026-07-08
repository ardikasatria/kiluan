"""Gerbang isolasi tenant (Kontrak API F0 §9) — lintas-tenant = 404, bukan 403."""
import pytest

from app.domain.enums import KodePeran, StatusKonten
from app.domain.errors import TidakDitemukan
from app.skema.destinasi import DestinasiBuat, DestinasiUbah
from conftest import beri_peran, buat_pengguna, konteks_untuk


def _buat(store, svc, desa_id, pengelola_id, slug):
    beri_peran(store, pengelola_id, KodePeran.pokdarwis, desa_id=desa_id)
    return svc.buat(
        konteks_untuk(store, pengelola_id), desa_id,
        DestinasiBuat(nama="X", slug=slug, kategori_id=1,
                      lokasi={"lat": -5.7, "lng": 105.1}, status=StatusKonten.publikasi),
    )


def test_kelola_resource_desa_lain_404(store, desa, desa_lain, svc_destinasi):
    pengelola_b = buat_pengguna(store, email="b@contoh.id")
    d_b = _buat(store, svc_destinasi, desa_lain.id, pengelola_b.id, "spot-b")

    # pokdarwis desa A mencoba mengelola destinasi milik desa B (via path desa A)
    pokdarwis_a = buat_pengguna(store, email="a@contoh.id")
    beri_peran(store, pokdarwis_a.id, KodePeran.pokdarwis, desa_id=desa.id)
    with pytest.raises(TidakDitemukan):
        svc_destinasi.ubah(konteks_untuk(store, pokdarwis_a.id), desa.id, d_b.id, DestinasiUbah(nama="Ubah"))


def test_cari_terfilter_desa(store, desa, desa_lain, svc_destinasi):
    pa = buat_pengguna(store, email="pa@contoh.id")
    pb = buat_pengguna(store, email="pb@contoh.id")
    _buat(store, svc_destinasi, desa.id, pa.id, "a1")
    _buat(store, svc_destinasi, desa_lain.id, pb.id, "b1")

    from app.domain.konteks import Konteks
    hasil = svc_destinasi.cari(Konteks(), desa.id)
    ids = {i["destinasi"].desa_id for i in hasil["item"]}
    assert ids == {desa.id}  # tak ada kebocoran dari desa_lain


def test_detail_slug_dalam_scope_desa(store, desa, desa_lain, svc_destinasi):
    pa = buat_pengguna(store, email="pa@contoh.id")
    d = _buat(store, svc_destinasi, desa.id, pa.id, "sama")
    from app.domain.konteks import Konteks
    # slug 'sama' hanya resolvable di desa yang benar
    with pytest.raises(TidakDitemukan):
        svc_destinasi.detail(Konteks(), desa_lain.id, "sama")
    ok = svc_destinasi.detail(Konteks(), desa.id, "sama")
    assert ok.id == d.id
