"""Jejak Lestari — dana konservasi (ledger transparan append-only).

- Inflow sumber=transaksi: otomatis & idempoten via UNIQUE(sumber_tipe, sumber_id).
- Outflow (keluar): bukti_media_id wajib.
- sumber_tipe=transaksi TIDAK boleh lewat endpoint publik (otomatis saja).
- saldo = Σ(masuk) − Σ(keluar); rincian per kategori/sumber (transparansi).
"""
from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from . import errors as E
from .enums import JenisDana, KategoriDana, SumberDana
from .model import DanaKonservasi, Transaksi
from .util import Jam, uuid7


class LayananDana:
    def __init__(self, repo_dana, jam: Jam):
        self.dana = repo_dana
        self.jam = jam

    async def catat(self, desa_id: UUID, dicatat_oleh: UUID, data: dict) -> DanaKonservasi:
        """Entri manual (bendahara/pokdarwis). keluar → bukti wajib; masuk → donasi/hibah/lainnya."""
        jenis = JenisDana(data["jenis"])
        sumber = data.get("sumber_tipe")
        if sumber is not None:
            sumber = SumberDana(sumber)
            if sumber == SumberDana.transaksi:
                # inflow transaksi otomatis, bukan lewat endpoint publik
                raise E.validasi_gagal("inflow transaksi otomatis, bukan manual")

        if jenis == JenisDana.keluar and not data.get("bukti_media_id"):
            raise E.bukti_media_wajib("pengeluaran wajib bukti")

        kategori = data.get("kategori")
        entri = DanaKonservasi(
            id=uuid7(), desa_id=desa_id, jenis=jenis, jumlah=float(data["jumlah"]),
            tanggal=data["tanggal"], dicatat_oleh=dicatat_oleh,
            sumber_tipe=sumber if jenis == JenisDana.masuk else None,
            kategori=KategoriDana(kategori) if (kategori and jenis == JenisDana.keluar) else None,
            keterangan=data.get("keterangan", ""),
            bukti_media_id=data.get("bukti_media_id"),
            dibuat_pada=self.jam.now(),
        )
        return await self.dana.simpan(entri)

    async def inflow_dari_transaksi(self, trx: Transaksi) -> DanaKonservasi:
        """Dipicu peristiwa transaksi_settle. Idempoten per sumber_id."""
        ada = await self.dana.daftar(
            trx.desa_id,
            lambda d: d.sumber_tipe == SumberDana.transaksi and d.sumber_id == trx.id)
        if ada:
            return ada[0]  # sudah tercatat → tak menggandakan
        entri = DanaKonservasi(
            id=uuid7(), desa_id=trx.desa_id, jenis=JenisDana.masuk,
            jumlah=trx.porsi_reinvestasi, tanggal=trx.tanggal, dicatat_oleh=trx.id,
            sumber_tipe=SumberDana.transaksi, sumber_id=trx.id,
            keterangan=f"reinvestasi transaksi {trx.id}", dibuat_pada=self.jam.now())
        return await self.dana.simpan(entri)

    async def saldo(self, desa_id: UUID) -> dict:
        entri = await self.dana.daftar(desa_id)
        masuk = sum(e.jumlah for e in entri if e.jenis == JenisDana.masuk)
        keluar = sum(e.jumlah for e in entri if e.jenis == JenisDana.keluar)
        per_kategori: dict = {}
        per_sumber: dict = {}
        for e in entri:
            if e.jenis == JenisDana.keluar and e.kategori:
                per_kategori[e.kategori.value] = per_kategori.get(e.kategori.value, 0) + e.jumlah
            if e.jenis == JenisDana.masuk and e.sumber_tipe:
                per_sumber[e.sumber_tipe.value] = per_sumber.get(e.sumber_tipe.value, 0) + e.jumlah
        return {
            "saldo": masuk - keluar,
            "total_masuk": masuk,
            "total_keluar": keluar,
            "per_kategori": per_kategori,
            "per_sumber": per_sumber,
            "diperbarui_pada": self.jam.now().isoformat(),
        }
