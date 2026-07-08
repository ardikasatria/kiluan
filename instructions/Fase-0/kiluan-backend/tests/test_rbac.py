"""Gerbang RBAC (Kontrak API F0 §9)."""
import pytest

from app.domain.enums import KodePeran, StatusKonten
from app.domain.errors import TidakBerwenang
from app.skema.destinasi import DestinasiBuat
from conftest import beri_peran, buat_pengguna, konteks_untuk


def _data(slug="gigi-hiu", status=StatusKonten.draft):
    return DestinasiBuat(
        nama="Pantai Gigi Hiu", slug=slug, kategori_id=1,
        lokasi={"lat": -5.79, "lng": 105.10}, status=status,
    )


def test_wisatawan_tak_boleh_buat_destinasi(store, desa, svc_destinasi):
    p = buat_pengguna(store)
    beri_peran(store, p.id, KodePeran.wisatawan, desa_id=desa.id)
    with pytest.raises(TidakBerwenang):
        svc_destinasi.buat(konteks_untuk(store, p.id), desa.id, _data())


def test_pokdarwis_boleh_buat_dan_publikasi(store, desa, svc_destinasi):
    p = buat_pengguna(store)
    beri_peran(store, p.id, KodePeran.pokdarwis, desa_id=desa.id)
    k = konteks_untuk(store, p.id)
    d = svc_destinasi.buat(k, desa.id, _data(status=StatusKonten.publikasi))
    assert d.status == StatusKonten.publikasi


def test_kontributor_tak_boleh_publikasi(store, desa, svc_destinasi):
    p = buat_pengguna(store)
    beri_peran(store, p.id, KodePeran.kontributor, desa_id=desa.id)
    with pytest.raises(TidakBerwenang):
        svc_destinasi.buat(konteks_untuk(store, p.id), desa.id, _data(status=StatusKonten.publikasi))


def test_admin_global_lolos_scope(store, desa, desa_lain, svc_destinasi):
    p = buat_pengguna(store)
    beri_peran(store, p.id, KodePeran.admin, desa_id=None)  # global
    k = konteks_untuk(store, p.id)
    # admin bisa mengelola desa manapun tanpa keanggotaan per-desa
    d1 = svc_destinasi.buat(k, desa.id, _data(slug="spot-a"))
    d2 = svc_destinasi.buat(k, desa_lain.id, _data(slug="spot-b"))
    assert d1.desa_id == desa.id and d2.desa_id == desa_lain.id


def test_anonim_tak_boleh_menulis(store, desa, svc_destinasi):
    from app.domain.errors import TidakTerautentikasi
    from app.domain.konteks import Konteks
    with pytest.raises(TidakTerautentikasi):
        svc_destinasi.buat(Konteks(), desa.id, _data())
