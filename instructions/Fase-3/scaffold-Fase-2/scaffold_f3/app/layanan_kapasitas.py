"""Jejak Lestari — daya dukung & pemakaian kapasitas.

Level lampu dari rasio vs ambang (input Pokdarwis, bukan hardcode).
Hook F2: booking baru saat spot 'merah' → daya_dukung_terlampaui (bila blokir aktif).
"""
from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from . import errors as E
from .enums import LevelKapasitas
from .model import DayaDukung, PemakaianKapasitas
from .util import Jam, uuid7


class LayananKapasitas:
    def __init__(self, repo_daya_dukung, repo_pemakaian, jam: Jam):
        self.daya_dukung = repo_daya_dukung
        self.pemakaian = repo_pemakaian
        self.jam = jam

    async def upsert_daya_dukung(self, desa_id: UUID, destinasi_id: UUID, *,
                                 kapasitas_harian: int, ambang_kuning: float,
                                 ambang_merah: float, metode_hitung: str = "booking+checkin") -> DayaDukung:
        if not (0 < ambang_kuning < ambang_merah <= 1.0):
            raise E.validasi_gagal("ambang: 0 < kuning < merah <= 1")
        ada = await self._config(desa_id, destinasi_id)
        if ada:
            ada.kapasitas_harian = kapasitas_harian
            ada.ambang_kuning = ambang_kuning
            ada.ambang_merah = ambang_merah
            ada.metode_hitung = metode_hitung
            ada.diperbarui_pada = self.jam.now()
            return await self.daya_dukung.simpan(ada)
        dd = DayaDukung(id=uuid7(), desa_id=desa_id, destinasi_id=destinasi_id,
                        kapasitas_harian=kapasitas_harian, ambang_kuning=ambang_kuning,
                        ambang_merah=ambang_merah, metode_hitung=metode_hitung,
                        diperbarui_pada=self.jam.now())
        return await self.daya_dukung.simpan(dd)

    async def _config(self, desa_id: UUID, destinasi_id: UUID) -> Optional[DayaDukung]:
        rows = await self.daya_dukung.daftar(desa_id, lambda d: d.destinasi_id == destinasi_id)
        return rows[0] if rows else None

    @staticmethod
    def _level(rasio: float, kuning: float, merah: float) -> LevelKapasitas:
        # ambang inklusif: rasio >= merah → merah; >= kuning → kuning
        if rasio >= merah:
            return LevelKapasitas.merah
        if rasio >= kuning:
            return LevelKapasitas.kuning
        return LevelKapasitas.hijau

    async def hitung(self, desa_id: UUID, destinasi_id: UUID, tanggal: date,
                     kunjungan: int) -> PemakaianKapasitas:
        dd = await self._config(desa_id, destinasi_id)
        if dd is None:
            raise E.validasi_gagal("daya_dukung belum dikonfigurasi")
        rasio = kunjungan / dd.kapasitas_harian if dd.kapasitas_harian else 0.0
        level = self._level(rasio, dd.ambang_kuning, dd.ambang_merah)
        ada = await self._snapshot(desa_id, destinasi_id, tanggal)
        if ada:
            ada.kunjungan = kunjungan
            ada.kapasitas_harian = dd.kapasitas_harian
            ada.rasio = rasio
            ada.level = level
            ada.dihitung_pada = self.jam.now()
            return await self.pemakaian.simpan(ada)
        pk = PemakaianKapasitas(id=uuid7(), desa_id=desa_id, destinasi_id=destinasi_id,
                                tanggal=tanggal, kunjungan=kunjungan,
                                kapasitas_harian=dd.kapasitas_harian, rasio=rasio,
                                level=level, dihitung_pada=self.jam.now())
        return await self.pemakaian.simpan(pk)

    async def _snapshot(self, desa_id: UUID, destinasi_id: UUID, tanggal: date) -> Optional[PemakaianKapasitas]:
        rows = await self.pemakaian.daftar(
            desa_id, lambda p: p.destinasi_id == destinasi_id and p.tanggal == tanggal)
        return rows[0] if rows else None

    async def level_hari_ini(self, desa_id: UUID, destinasi_id: UUID,
                             tanggal: date) -> Optional[PemakaianKapasitas]:
        return await self._snapshot(desa_id, destinasi_id, tanggal)

    async def cek_blokir_booking(self, desa_id: UUID, destinasi_id: UUID, tanggal: date,
                                 blokir_aktif: bool) -> None:
        """Hook checkout F2. Default blokir_aktif=False → hanya peringatan."""
        if not blokir_aktif:
            return
        snap = await self._snapshot(desa_id, destinasi_id, tanggal)
        if snap and snap.level == LevelKapasitas.merah:
            raise E.daya_dukung_terlampaui(f"{destinasi_id} merah pada {tanggal}")
