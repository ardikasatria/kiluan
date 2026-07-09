"""Pemandu F2 — itinerary/estimasi/chat via MesinPemandu (rule default, model lokal opsional)."""
from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from app.domain.errors import TidakDitemukan
from app.domain.konteks import Konteks
from app.inti.pemandu import KonteksPemandu, ambil_mesin
from app.model import tabel as M
from app.repo.f2_sql import (
    RepoPercakapanPemanduSQL,
    RepoSesiPemanduSQL,
    RepoSlotJadwalSQL,
    _now,
)


class PemanduLayanan:
    def __init__(self, store):
        self.store = store
        s = store.sesi
        self.slot = RepoSlotJadwalSQL(s)
        self.sesi = RepoSesiPemanduSQL(s)
        self.percakapan = RepoPercakapanPemanduSQL(s)
        self.mesin = ambil_mesin()

    async def _slot_buka(self, desa_id: UUID) -> list[M.SlotJadwal]:
        return [
            s for s in await self.slot.daftar(desa_id)
            if s.status == "buka" and s.sisa > 0
        ]

    async def _paket_map(self, desa_id: UUID, slots: list[M.SlotJadwal]) -> dict[str, Any]:
        ids = {s.subjek_id for s in slots if s.subjek_tipe == "paket_wisata"}
        out: dict[str, Any] = {}
        for pid in ids:
            p = await self.store.paket.ambil(pid)
            if p and p.desa_id == desa_id:
                out[str(pid)] = p
        return out

    async def _harga_item(self, desa_id: UUID, item_tipe: str, item_id: str) -> Decimal:
        uid = UUID(item_id)
        if item_tipe == "produk_jasa":
            src = await self.store.produk.ambil(uid)
        else:
            src = await self.store.paket.ambil(uid)
        if src is None or src.desa_id != desa_id:
            raise TidakDitemukan("Item estimasi tak ada.")
        return Decimal(str(src.harga))

    async def itinerary(self, konteks: Konteks, desa_id: UUID, masukan: dict) -> M.SesiPemandu:
        slots = await self._slot_buka(desa_id)
        paket_map = await self._paket_map(desa_id, slots)
        destinasi = await self.store.destinasi.daftar(desa_id)
        ctx = KonteksPemandu(
            desa_id=str(desa_id),
            masukan=masukan,
            slot_tersedia=slots,
            destinasi=destinasi,
            paket_map=paket_map,
        )
        keluaran = await self.mesin.susun_itinerary(ctx)
        sesi = M.SesiPemandu(
            id=uuid4(),
            desa_id=desa_id,
            pengguna_id=konteks.pengguna_id,
            tipe="itinerary",
            masukan=masukan,
            keluaran=keluaran,
            model_dipakai=self.mesin.kode_db,
            dibuat_pada=_now(),
        )
        return await self.sesi.simpan(sesi)

    async def estimasi(
        self, konteks: Konteks, desa_id: UUID, item: list[dict],
    ) -> M.SesiPemandu:
        async def harga_fn(tipe: str, iid: str) -> Decimal:
            return await self._harga_item(desa_id, tipe, iid)

        total = await self.mesin.estimasi_item(item, harga_fn)
        keluaran = {"total": float(total)}
        sesi = M.SesiPemandu(
            id=uuid4(),
            desa_id=desa_id,
            pengguna_id=konteks.pengguna_id,
            tipe="estimasi",
            masukan={"item": item},
            keluaran=keluaran,
            model_dipakai=self.mesin.kode_db,
            dibuat_pada=_now(),
        )
        return await self.sesi.simpan(sesi)

    async def chat(
        self,
        konteks: Konteks,
        desa_id: UUID,
        pesan: str,
        sesi_id: UUID | None = None,
    ) -> tuple[M.SesiPemandu, M.PercakapanPemandu, M.PercakapanPemandu]:
        if sesi_id:
            sesi = await self.sesi.wajib(sesi_id, desa_id)
            if sesi.pengguna_id and sesi.pengguna_id != konteks.pengguna_id:
                raise TidakDitemukan("Sesi tidak ditemukan.")
            if sesi.tipe != "chat":
                raise TidakDitemukan("Sesi bukan tipe chat.")
        else:
            sesi = M.SesiPemandu(
                id=uuid4(),
                desa_id=desa_id,
                pengguna_id=konteks.pengguna_id,
                tipe="chat",
                masukan={},
                keluaran=None,
                model_dipakai=self.mesin.kode_db,
                dibuat_pada=_now(),
            )
            sesi = await self.sesi.simpan(sesi)

        destinasi = await self.store.destinasi.daftar(desa_id)
        ctx = KonteksPemandu(desa_id=str(desa_id), masukan={}, destinasi=destinasi)
        jawab, sumber = await self.mesin.jawab_chat(pesan, ctx)

        baris_user = M.PercakapanPemandu(
            id=uuid4(),
            sesi_id=sesi.id,
            peran="pengguna",
            isi=pesan,
            dibuat_pada=_now(),
        )
        baris_asisten = M.PercakapanPemandu(
            id=uuid4(),
            sesi_id=sesi.id,
            peran="asisten",
            isi=jawab,
            sumber=sumber or None,
            dibuat_pada=_now(),
        )
        await self.percakapan.simpan(baris_user)
        await self.percakapan.simpan(baris_asisten)
        return sesi, baris_user, baris_asisten

    async def ambil_sesi(
        self, konteks: Konteks, desa_id: UUID, sesi_id: UUID,
    ) -> tuple[M.SesiPemandu, list[M.PercakapanPemandu]]:
        sesi = await self.sesi.wajib(sesi_id, desa_id)
        if sesi.pengguna_id and sesi.pengguna_id != konteks.pengguna_id:
            raise TidakDitemukan("Sesi tidak ditemukan.")
        riwayat = await self.percakapan.daftar_sesi(sesi_id)
        return sesi, riwayat
