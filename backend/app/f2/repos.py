"""Repositori in-memory async. Filter tenant per-desa_id, lock per-slot (emulasi
SELECT ... FOR UPDATE), dan penyimpanan idempotensi (uang/poin & webhook)."""
from __future__ import annotations

import asyncio
from typing import Any

from . import errors


class Repo:
    """Store generik. Kunci = id. Filter desa_id wajib pada query domain."""

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    async def simpan(self, ent):
        self._data[ent.id] = ent
        return ent

    async def ambil(self, id_: str, desa_id: str | None = None):
        ent = self._data.get(id_)
        if ent is None:
            return None
        if desa_id is not None and getattr(ent, "desa_id", None) not in (desa_id, None):
            return None  # lintas-tenant → seolah tak ada
        return ent

    async def wajib(self, id_: str, desa_id: str | None = None):
        ent = await self.ambil(id_, desa_id)
        if ent is None:
            raise errors.tidak_ditemukan()
        return ent

    async def daftar(self, desa_id: str | None = None, **filter):
        hasil = []
        for ent in self._data.values():
            if desa_id is not None and getattr(ent, "desa_id", None) not in (desa_id, None):
                continue
            if all(getattr(ent, k, None) == v for k, v in filter.items()):
                hasil.append(ent)
        # keyset: id terurut waktu-pembuatan
        return sorted(hasil, key=lambda e: e.id)

    def semua(self):
        return list(self._data.values())


class SlotRepo(Repo):
    def __init__(self) -> None:
        super().__init__()
        self._locks: dict[str, asyncio.Lock] = {}

    def lock(self, slot_id: str) -> asyncio.Lock:
        return self._locks.setdefault(slot_id, asyncio.Lock())


class TokoIdempotensi:
    """Map (key, pengguna, endpoint) -> hasil tersimpan (TTL diabaikan di scaffold)."""

    def __init__(self) -> None:
        self._m: dict[tuple, Any] = {}

    def wajib_key(self, key: str | None):
        if not key:
            raise errors.idempotency_wajib()

    def ambil(self, key, pengguna, endpoint):
        return self._m.get((key, pengguna, endpoint))

    def simpan(self, key, pengguna, endpoint, hasil):
        self._m[(key, pengguna, endpoint)] = hasil
        return hasil


class Basis:
    """Kumpulan repo — satu instans per uji (state bersih)."""

    def __init__(self) -> None:
        self.pengaturan = Repo()
        self.produk = Repo()
        self.paket = Repo()
        self.slot = SlotRepo()
        self.pesanan = Repo()
        self.item = Repo()
        self.booking = Repo()
        self.pembayaran = Repo()
        self.webhook = Repo()
        self.transaksi = Repo()
        self.rekening = Repo()
        self.payout = Repo()
        self.refund = Repo()
        self.transaksi_poin = Repo()
        self.hadiah = Repo()
        self.penukaran = Repo()
        self.kupon = Repo()
        self.pemakaian_kupon = Repo()
        self.stasiun = Repo()
        self.misi = Repo()
        self.paspor = Repo()
        self.stempel = Repo()
        self.verifikasi = Repo()
        self.sesi = Repo()
        self.sertifikasi: dict[tuple, str] = {}  # (desa,pengguna) -> tingkat owner
        self.idem = TokoIdempotensi()
        self._webhook_events: set[str] = set()  # event_id UNIQUE

    async def pengaturan_desa(self, desa_id: str):
        p = await self.pengaturan.ambil(desa_id)
        if p is None:
            raise errors.tidak_ditemukan("Pengaturan desa belum diset.")
        return p
