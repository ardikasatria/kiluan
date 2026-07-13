"""Gerbang kontrak addendum F2 — Genta (notifikasi + outbox)."""
from __future__ import annotations

from uuid import UUID, uuid4

import pytest
import pytest_asyncio

from app.domain import entitas as E
from app.domain.errors import TidakBerwenang, TidakDitemukan
from app.domain.enums import KodePeran
from app.inti.outbox import Outbox
from app.inti.pengirim_notifikasi import PengirimNotifikasi
from app.layanan.genta import GentaLayanan
from tests.conftest import beri_peran, buat_pengguna, konteks_untuk


@pytest_asyncio.fixture
async def genta(store):
    return GentaLayanan(store)


@pytest_asyncio.fixture
async def outbox(store):
    return Outbox(store)


@pytest_asyncio.fixture
async def dispatcher(store):
    return PengirimNotifikasi(store)


@pytest_asyncio.fixture
async def pembeli(store, desa):
    p = await buat_pengguna(store, email="pembeli@genta.id")
    await beri_peran(store, p.id, KodePeran.wisatawan, desa.id)
    return p


@pytest_asyncio.fixture
async def bendahara(store, desa):
    p = await buat_pengguna(store, email="bendahara@genta.id")
    await beri_peran(store, p.id, KodePeran.kontributor, desa.id)
    return p


@pytest_asyncio.fixture
async def aktor_pembeli(store, pembeli):
    return await konteks_untuk(store, pembeli.id)


@pytest_asyncio.fixture
async def aktor_lain(store, desa):
    p = await buat_pengguna(store, email="lain@genta.id")
    await beri_peran(store, p.id, KodePeran.wisatawan, desa.id)
    return await konteks_untuk(store, p.id)


@pytest.mark.asyncio
async def test_emit_menulis_satu_peristiwa(outbox, store, desa):
    entitas_id = uuid4()
    await outbox.emit(
        desa.id, "pembayaran_berhasil", "pembayaran", entitas_id,
        {"pembeli_id": str(uuid4())},
    )
    rows = await store.peristiwa.cari(desa_id=desa.id, jenis="pembayaran_berhasil")
    assert len(rows) == 1
    assert rows[0].entitas_id == entitas_id


@pytest.mark.asyncio
async def test_dispatcher_fan_out_penerima_benar(dispatcher, outbox, store, desa, pembeli, bendahara):
    entitas_id = uuid4()
    await outbox.emit(
        desa.id, "pembayaran_berhasil", "pembayaran", entitas_id,
        {"pembeli_id": str(pembeli.id)},
    )
    await dispatcher.proses_antrian()
    inbox_pembeli = await store.notifikasi.daftar_inbox(desa.id, pembeli.id)
    assert len(inbox_pembeli) == 1
    assert inbox_pembeli[0].tipe == "pembayaran_berhasil"
    inbox_bendahara = await store.notifikasi.daftar_inbox(desa.id, bendahara.id)
    assert len(inbox_bendahara) == 0


@pytest.mark.asyncio
async def test_dispatcher_idempoten(dispatcher, outbox, store, desa, pembeli):
    entitas_id = uuid4()
    p = await outbox.emit(
        desa.id, "pembayaran_berhasil", "pembayaran", entitas_id,
        {"pembeli_id": str(pembeli.id)},
    )
    await dispatcher.proses_antrian()
    # simulasi retry: reset diproses_pada dan proses lagi
    row = await store.peristiwa.ambil(p.id)
    assert row is not None
    row.diproses_pada = None
    await store.peristiwa.simpan(row)
    await dispatcher.proses_antrian()
    inbox = await store.notifikasi.daftar_inbox(desa.id, pembeli.id)
    assert len(inbox) == 1


@pytest.mark.asyncio
async def test_inbox_isolasi_tenant(genta, store, desa, desa_lain, aktor_pembeli, pembeli):
    n = E.Notifikasi(
        desa_id=desa_lain.id,
        penerima_id=pembeli.id,
        tipe="pembayaran_berhasil",
        judul="X",
        isi="Y",
        entitas_tipe="pembayaran",
        entitas_id=uuid4(),
    )
    await store.notifikasi.tambah_idempoten(n)
    with pytest.raises(TidakDitemukan):
        await genta.baca(aktor_pembeli, desa.id, n.id)


@pytest.mark.asyncio
async def test_baca_dan_hitung(genta, store, desa, aktor_pembeli, pembeli):
    for i in range(2):
        await store.notifikasi.tambah_idempoten(E.Notifikasi(
            desa_id=desa.id,
            penerima_id=pembeli.id,
            tipe=f"tipe_{i}",
            judul=f"J{i}",
            isi=f"I{i}",
            entitas_tipe="pesanan",
            entitas_id=uuid4(),
            peristiwa_id=None,
        ))
    hitung = await genta.hitung(aktor_pembeli, desa.id)
    assert hitung["belum_dibaca"] == 2
    inbox = await genta.inbox(aktor_pembeli, desa.id)
    n_id = inbox["item"][0]["id"]
    await genta.baca(aktor_pembeli, desa.id, UUID(n_id))
    hitung2 = await genta.hitung(aktor_pembeli, desa.id)
    assert hitung2["belum_dibaca"] == 1


@pytest.mark.asyncio
async def test_baca_semua(genta, store, desa, aktor_pembeli, pembeli):
    await store.notifikasi.tambah_idempoten(E.Notifikasi(
        desa_id=desa.id,
        penerima_id=pembeli.id,
        tipe="tipe_a",
        judul="J",
        isi="I",
        entitas_tipe="pesanan",
        entitas_id=uuid4(),
    ))
    hasil = await genta.baca_semua(aktor_pembeli, desa.id)
    assert hasil["ditandai"] == 1
    assert (await genta.hitung(aktor_pembeli, desa.id))["belum_dibaca"] == 0


@pytest.mark.asyncio
async def test_baca_bukan_pemilik(genta, store, desa, aktor_pembeli, aktor_lain, pembeli):
    n = E.Notifikasi(
        desa_id=desa.id,
        penerima_id=pembeli.id,
        tipe="tipe_x",
        judul="J",
        isi="I",
        entitas_tipe="pesanan",
        entitas_id=uuid4(),
    )
    await store.notifikasi.tambah_idempoten(n)
    with pytest.raises(TidakBerwenang):
        await genta.baca(aktor_lain, desa.id, n.id)
