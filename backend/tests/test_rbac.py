"""Gerbang RBAC (Kontrak API F0 §9) — async."""
import pytest

from app.domain.enums import KodePeran, StatusKonten
from app.domain.errors import TidakBerwenang
from app.skema.destinasi import DestinasiBuat
from conftest import beri_peran, buat_pengguna, konteks_untuk


def _data(slug="gigi-hiu", status=StatusKonten.draft):
    return DestinasiBuat(nama="Pantai Gigi Hiu", slug=slug, kategori_id=1,
                         lokasi={"lat": -5.79, "lng": 105.10}, status=status)


async def test_wisatawan_tak_boleh_buat_destinasi(store, desa, svc_destinasi):
    p = await buat_pengguna(store)
    await beri_peran(store, p.id, KodePeran.wisatawan, desa_id=desa.id)
    with pytest.raises(TidakBerwenang):
        await svc_destinasi.buat(await konteks_untuk(store, p.id), desa.id, _data())


async def test_kontributor_boleh_buat_dan_publikasi(store, desa, svc_destinasi):
    p = await buat_pengguna(store)
    await beri_peran(store, p.id, KodePeran.kontributor, desa_id=desa.id)
    d = await svc_destinasi.buat(await konteks_untuk(store, p.id), desa.id,
                                 _data(status=StatusKonten.publikasi))
    assert d.status == StatusKonten.publikasi


async def test_admin_global_lolos_scope(store, desa, desa_lain, svc_destinasi):
    p = await buat_pengguna(store)
    await beri_peran(store, p.id, KodePeran.admin, desa_id=None)
    k = await konteks_untuk(store, p.id)
    d1 = await svc_destinasi.buat(k, desa.id, _data(slug="spot-a"))
    d2 = await svc_destinasi.buat(k, desa_lain.id, _data(slug="spot-b"))
    assert d1.desa_id == desa.id and d2.desa_id == desa_lain.id


async def test_anonim_tak_boleh_menulis(store, desa, svc_destinasi):
    from app.domain.errors import TidakTerautentikasi
    from app.domain.konteks import Konteks
    with pytest.raises(TidakTerautentikasi):
        await svc_destinasi.buat(Konteks(), desa.id, _data())
