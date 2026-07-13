"""Anjungan Data — job registry + outbox ETL + gold agregat.

- mulai_job(): guard konkuren per lapisan → job_sedang_berjalan.
- proses_outbox_gold(): kursor diproses_pada → tepat-sekali (job ulang tak menggandakan).
- agregat_harian: nilai turunan read-only (job-authoritative), disajikan ke dashboard.
Peta peristiwa→metrik: transaksi_settle→pendapatan+kontribusi; booking_selesai→kunjungan.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from . import errors as E
from .enums import JenisPeristiwa, KodeMetrik, Lapisan, StatusJob
from .model import AgregatHarian, JobAnalitik
from .util import Jam, kunci_dimensi, uuid7


class LayananAgregat:
    def __init__(self, repo_peristiwa, repo_agregat, repo_job, jam: Jam):
        self.peristiwa = repo_peristiwa
        self.agregat = repo_agregat
        self.job = repo_job
        self.jam = jam

    async def mulai_job(self, lapisan: Lapisan, desa_id: Optional[UUID], nama: str) -> JobAnalitik:
        semua = await self.job.semua()
        if any(j.lapisan == lapisan and j.status == StatusJob.berjalan for j in semua):
            raise E.job_sedang_berjalan(f"lapisan {lapisan.value} masih berjalan")
        j = JobAnalitik(id=uuid7(), desa_id=desa_id, lapisan=lapisan, nama_job=nama,
                        status=StatusJob.berjalan, mulai_pada=self.jam.now())
        return await self.job.simpan(j)

    async def _selesai_job(self, j: JobAnalitik, masuk: int, keluar: int) -> None:
        j.status = StatusJob.sukses
        j.baris_masuk = masuk
        j.baris_keluar = keluar
        j.selesai_pada = self.jam.now()
        await self.job.simpan(j)

    async def _upsert_agregat(self, desa_id: UUID, tanggal: date, metrik: KodeMetrik,
                              dimensi: dict, tambah: float) -> None:
        kd = kunci_dimensi(dimensi)
        rows = await self.agregat.daftar(
            desa_id, lambda a: a.tanggal == tanggal and a.kode_metrik == metrik
            and kunci_dimensi(a.dimensi) == kd)
        if rows:
            rows[0].nilai += tambah
            rows[0].diperbarui_pada = self.jam.now()
            await self.agregat.simpan(rows[0])
        else:
            await self.agregat.simpan(AgregatHarian(
                id=uuid7(), desa_id=desa_id, tanggal=tanggal, kode_metrik=metrik,
                dimensi=dict(dimensi), nilai=tambah, diperbarui_pada=self.jam.now()))

    async def proses_outbox_gold(self, desa_id: Optional[UUID] = None) -> JobAnalitik:
        """ETL inkremental: konsumsi peristiwa belum-diproses → agregat gold.

        Idempoten via kursor diproses_pada: run ulang tak memproses peristiwa lama.
        """
        j = await self.mulai_job(Lapisan.gold, desa_id, "outbox→gold")
        belum = await self.peristiwa.daftar(
            desa_id, lambda p: p.diproses_pada is None)
        masuk = len(belum)
        keluar = 0
        for p in sorted(belum, key=lambda x: x.id.int):
            m = p.muatan
            tgl = date.fromisoformat(m["tanggal"]) if "tanggal" in m else p.terjadi_pada.date()
            if p.jenis == JenisPeristiwa.transaksi_settle.value:
                await self._upsert_agregat(p.desa_id, tgl, KodeMetrik.pendapatan,
                                           {"penyedia_id": m["penyedia_id"]}, m["bruto"])
                await self._upsert_agregat(p.desa_id, tgl, KodeMetrik.kontribusi,
                                           {}, m["porsi_reinvestasi"])
                keluar += 2
            elif p.jenis == JenisPeristiwa.booking_selesai.value:
                await self._upsert_agregat(p.desa_id, tgl, KodeMetrik.kunjungan,
                                           {"destinasi_id": m["destinasi_id"]}, m["jumlah_orang"])
                keluar += 1
            # tandai kursor (tepat-sekali)
            p.diproses_pada = self.jam.now()
            await self.peristiwa.simpan(p)
        await self._selesai_job(j, masuk, keluar)
        return j

    async def baca_agregat(self, desa_id: UUID, kode_metrik: str, dari: date, sampai: date,
                           dimensi: Optional[dict] = None) -> List[AgregatHarian]:
        try:
            metrik = KodeMetrik(kode_metrik)
        except ValueError:
            raise E.metrik_tidak_dikenal(kode_metrik)
        kd = kunci_dimensi(dimensi) if dimensi else None
        return await self.agregat.daftar(
            desa_id,
            lambda a: a.kode_metrik == metrik and dari <= a.tanggal <= sampai
            and (kd is None or kunci_dimensi(a.dimensi) == kd))

    async def total_metrik(self, desa_id: UUID, kode_metrik: str, dari: date, sampai: date) -> float:
        rows = await self.baca_agregat(desa_id, kode_metrik, dari, sampai)
        return sum(a.nilai for a in rows)
