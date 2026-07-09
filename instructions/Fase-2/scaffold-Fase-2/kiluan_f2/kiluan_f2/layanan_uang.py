"""Payout (batch transaksi dirilis) + Refund (kebijakan escrow)."""
from __future__ import annotations

from decimal import Decimal

from . import enums, errors
from .clock import Jam, id_baru
from .models import Payout, Refund, Transaksi
from .repos import Basis


class UangService:
    def __init__(self, basis: Basis, jam: Jam) -> None:
        self.b = basis
        self.jam = jam

    async def buat_payout(self, desa_id, aktor, penyedia_tipe, penyedia_id, rekening_id,
                          metode="manual", idempotency_key=None):
        self.b.idem.wajib_key(idempotency_key)
        cache = self.b.idem.ambil(idempotency_key, aktor.pengguna_id, "payout")
        if cache is not None:
            return cache
        if not aktor.punya(*enums.BENDAHARA):
            raise errors.tidak_berwenang("Hanya bendahara/pengelola.")
        rek = await self.b.rekening.wajib(rekening_id, desa_id)
        if not rek.terverifikasi:
            raise errors.validasi_gagal("Rekening belum terverifikasi.")

        # kumpulkan transaksi dirilis, belum dipayout, penyedia cocok
        kandidat = [
            t for t in await self.b.transaksi.daftar(desa_id)
            if t.penyedia_tipe == penyedia_tipe and t.penyedia_id == penyedia_id
            and t.status == "dirilis" and t.payout_id is None and t.jenis == "penjualan"
        ]
        if not kandidat:
            raise errors.validasi_gagal("Tak ada transaksi untuk dipayout.")
        jumlah = sum((t.neto_penyedia for t in kandidat), Decimal(0))
        payout = Payout(
            id=id_baru(), desa_id=desa_id, penyedia_tipe=penyedia_tipe, penyedia_id=penyedia_id,
            rekening_id=rekening_id, jumlah=jumlah, metode=metode, dibuat_pada=self.jam.now(),
        )
        await self.b.payout.simpan(payout)
        for t in kandidat:
            t.payout_id = payout.id  # cegah dobel payout
        return self.b.idem.simpan(idempotency_key, aktor.pengguna_id, "payout", payout)

    async def transisi_payout(self, desa_id, aktor, payout_id, aksi):
        if not aktor.punya(*enums.BENDAHARA):
            raise errors.tidak_berwenang()
        payout = await self.b.payout.wajib(payout_id, desa_id)
        if aksi == "tandai_berhasil":
            payout.status = "berhasil"
            payout.diproses_pada = self.jam.now()
        elif aksi == "tandai_gagal":
            payout.status = "gagal"
            for t in await self.b.transaksi.daftar(desa_id):
                if t.payout_id == payout_id:
                    t.payout_id = None  # lepas agar bisa dipayout ulang
        else:
            raise errors.transisi_ilegal(f"Aksi {aksi} tak sah.")
        return payout

    async def ajukan_refund(self, desa_id, aktor, pesanan_id, alasan, jumlah=None,
                            pesanan_item_id=None, idempotency_key=None):
        self.b.idem.wajib_key(idempotency_key)
        cache = self.b.idem.ambil(idempotency_key, aktor.pengguna_id, "refund")
        if cache is not None:
            return cache
        pesanan = await self.b.pesanan.wajib(pesanan_id, desa_id)
        if aktor.pengguna_id != pesanan.pembeli_id and not aktor.punya(*enums.PENGELOLA):
            raise errors.tidak_berwenang()
        r = Refund(
            id=id_baru(), desa_id=desa_id, pesanan_id=pesanan_id, pemohon_id=aktor.pengguna_id,
            alasan=alasan, jumlah=Decimal(str(jumlah)) if jumlah is not None else pesanan.total,
            dibuat_pada=self.jam.now(), pesanan_item_id=pesanan_item_id,
        )
        await self.b.refund.simpan(r)
        return self.b.idem.simpan(idempotency_key, aktor.pengguna_id, "refund", r)

    async def transisi_refund(self, desa_id, aktor, refund_id, aksi):
        if not aktor.punya(*enums.PENGELOLA):
            raise errors.tidak_berwenang()
        r = await self.b.refund.wajib(refund_id, desa_id)
        pesanan = await self.b.pesanan.wajib(r.pesanan_id, desa_id)
        alur = {
            "setuju": ("diajukan", "disetujui"),
            "tolak": ("diajukan", "ditolak"),
            "proses": ("disetujui", "diproses"),
            "selesai": ("diproses", "selesai"),
        }
        if aksi not in alur:
            raise errors.transisi_ilegal(f"Aksi {aksi} tak sah.")
        dari, ke = alur[aksi]
        if r.status != dari:
            raise errors.transisi_ilegal(f"{r.status} → {ke} tak sah.")

        if aksi == "proses":
            # kebijakan escrow: refund setelah pesanan selesai → jalur manual
            if pesanan.status == "selesai":
                raise errors.kebijakan_refund()
            # tulis transaksi refund negatif per penyedia (append-only)
            for t in await self.b.transaksi.daftar(desa_id):
                if t.pesanan_id == r.pesanan_id and t.jenis == "penjualan":
                    await self.b.transaksi.simpan(
                        Transaksi(
                            id=id_baru(), desa_id=desa_id, pesanan_id=r.pesanan_id,
                            pembayaran_id=t.pembayaran_id, penyedia_tipe=t.penyedia_tipe,
                            penyedia_id=t.penyedia_id, jenis="refund", bruto=-t.bruto,
                            fee_platform=-t.fee_platform, porsi_reinvestasi=-t.porsi_reinvestasi,
                            neto_penyedia=-t.neto_penyedia, status="direfund",
                            dibuat_pada=self.jam.now(),
                        )
                    )
                    t.status = "direfund"
            pesanan.status = "refund"
        r.status = ke
        if ke == "selesai":
            r.selesai_pada = self.jam.now()
        return r
