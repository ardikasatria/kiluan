from datetime import date, timedelta
from uuid import uuid4

import pytest

from app.errors import GalatDomain
from app.model import IndikatorEkologi
from app.enums import ArahBaik
from app.util import halaman, uuid7
from .conftest import PERIODE, TGL


async def test_isolasi_tenant_dana(svc, desa_a, desa_b):
    """Gate 13: ledger desa A tak terlihat desa B."""
    from app.model import Transaksi
    await svc["dana"].inflow_dari_transaksi(Transaksi(
        id=uuid4(), desa_id=desa_a, penyedia_tipe="umkm", penyedia_id=uuid4(),
        bruto=100_000, porsi_reinvestasi=10_000, neto_penyedia=90_000, tanggal=TGL))
    sa = await svc["dana"].saldo(desa_a)
    sb = await svc["dana"].saldo(desa_b)
    assert sa["saldo"] == 10_000
    assert sb["saldo"] == 0


async def test_isolasi_tenant_monitoring(svc, repos, desa_a, desa_b):
    ind_a = IndikatorEkologi(id=10, desa_id=desa_a, kode="x", nama="X", satuan="%",
                             arah_baik=ArahBaik.naik)
    await repos["indikator"].simpan(ind_a)
    m = await svc["monitoring"].catat(desa_a, uuid4(), {
        "indikator_id": 10, "nilai": 5, "waktu_ukur": TGL, "metode": "survei_lapangan"})
    # desa B tak boleh membaca monitoring desa A
    assert await repos["monitoring"].ambil(desa_b, m.id) is None
    assert await repos["monitoring"].ambil(desa_a, m.id) is not None


async def test_indikator_template_lintas_desa(repos, desa_a, desa_b):
    """Template global (desa_id=None) boleh dibaca lintas-desa."""
    tmpl = IndikatorEkologi(id=99, desa_id=None, kode="global_karang", nama="K",
                            satuan="%", arah_baik=ArahBaik.naik)
    await repos["indikator"].simpan(tmpl)
    assert await repos["indikator"].ambil(desa_a, 99) is not None
    assert await repos["indikator"].ambil(desa_b, 99) is not None


async def test_paginasi_keyset_stabil():
    """Keyset stabil saat baris disisipkan di tengah iterasi."""
    ids = [uuid7() for _ in range(5)]
    items = [{"id": i} for i in ids]
    h1 = halaman(items, lambda x: x["id"], cursor=None, limit=2)
    assert len(h1.data) == 2 and h1.ada_lagi
    # sisip baris baru (id lebih besar) di tengah — tak menggeser halaman berikut
    items.append({"id": uuid7()})
    h2 = halaman(items, lambda x: x["id"], cursor=h1.cursor_berikutnya, limit=2)
    ids_h1 = {x["id"] for x in h1.data}
    ids_h2 = {x["id"] for x in h2.data}
    assert ids_h1.isdisjoint(ids_h2)  # tak ada duplikasi/lewat


async def test_laporan_finalkan_dobel(svc, desa_a):
    """Gate 11: finalkan laporan yg sudah final → periode_final."""
    lap = await svc["laporan"].generate(desa_a, PERIODE, {"gmv": 1})
    await svc["laporan"].finalkan(desa_a, lap.id, file_media_id=uuid4())
    with pytest.raises(GalatDomain) as e:
        await svc["laporan"].finalkan(desa_a, lap.id)
    assert e.value.kode == "periode_final"
