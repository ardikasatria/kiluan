"""Pemandu AI rule-based: itinerary menghormati kuota slot, estimasi harga. LLM di-gate."""
from __future__ import annotations

from decimal import Decimal

from . import errors
from .clock import Jam, id_baru
from .models import SesiPemandu
from .repos import Basis


class PemanduService:
    def __init__(self, basis: Basis, jam: Jam) -> None:
        self.b = basis
        self.jam = jam

    async def itinerary(self, desa_id, aktor, masukan):
        pengguna_id = getattr(aktor, "pengguna_id", None)
        slot_tersedia = [
            s for s in await self.b.slot.daftar(desa_id)
            if s.status == "buka" and s.sisa > 0
        ]
        budget = Decimal(str(masukan.get("budget", 10**12)))
        rencana, biaya = [], Decimal(0)
        for s in slot_tersedia:
            harga = s.harga_override or Decimal(0)
            if biaya + harga > budget:
                continue
            rencana.append({"slot_id": s.id, "tanggal": s.tanggal, "harga": harga})
            biaya += harga
        keluaran = {"itinerary": rencana, "perkiraan_biaya": biaya}
        sesi = SesiPemandu(
            id=id_baru(), desa_id=desa_id, tipe="itinerary", masukan=masukan,
            dibuat_pada=self.jam.now(), pengguna_id=pengguna_id, keluaran=keluaran,
            model_dipakai="rule",
        )
        await self.b.sesi.simpan(sesi)
        return sesi

    async def estimasi(self, desa_id, aktor, item):
        total = Decimal(0)
        for it in item:
            if it["item_tipe"] == "produk_jasa":
                src = await self.b.produk.ambil(it["item_id"], desa_id)
            else:
                src = await self.b.paket.ambil(it["item_id"], desa_id)
            if src is None:
                raise errors.tidak_ditemukan("Item estimasi tak ada.")
            total += src.harga * int(it.get("jumlah", 1))
        sesi = SesiPemandu(
            id=id_baru(), desa_id=desa_id, tipe="estimasi", masukan={"item": item},
            dibuat_pada=self.jam.now(), pengguna_id=getattr(aktor, "pengguna_id", None),
            keluaran={"total": total}, model_dipakai="rule",
        )
        await self.b.sesi.simpan(sesi)
        return sesi

    async def ambil_sesi(self, desa_id, aktor, sesi_id):
        sesi = await self.b.sesi.wajib(sesi_id, desa_id)
        if sesi.pengguna_id and sesi.pengguna_id != getattr(aktor, "pengguna_id", None):
            raise errors.tidak_ditemukan()  # sesi orang lain
        return sesi
