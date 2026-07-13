"""Anjungan Data — job gold + outbox ETL + agregat harian."""
from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select

from app.domain import konteks as ctx
from app.domain import rbac
from app.domain.errors import JobSedangBerjalan, MetrikTidakDikenal, TidakBerwenang, TidakDitemukan
from app.f3.enums import JenisPeristiwaAnalitik, KodeMetrik, Lapisan, METRIK_PKM, StatusJob
from app.f3.util import kunci_dimensi, periode_dari_tanggal, uuid7
from app.model import tabel as M


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_tanggal(muatan: dict, fallback: datetime) -> date:
    if "tanggal" in muatan:
        return date.fromisoformat(str(muatan["tanggal"])[:10])
    return fallback.date() if hasattr(fallback, "date") else fallback


class AgregatLayanan:
    def __init__(self, store):
        self.store = store
        self.agregat = store.agregat
        self.job = store.job_analitik
        self.peristiwa = store.peristiwa
        self._sql = getattr(store, "sesi", None) is not None

    def _lock_key(self, lapisan: str, desa_id: UUID | None) -> str:
        return f"{lapisan}:{desa_id or 'global'}"

    async def _ada_job_berjalan(self, lapisan: str, desa_id: UUID | None = None) -> bool:
        rows = await self.job.daftar(lapisan=lapisan, status=StatusJob.berjalan.value)
        if desa_id is None:
            return any(j.desa_id is None for j in rows)
        return any(j.desa_id in (None, desa_id) for j in rows)

    async def mulai_job(
        self, lapisan: Lapisan, desa_id: UUID | None, nama: str,
    ) -> M.JobAnalitik:
        if await self._ada_job_berjalan(lapisan.value, desa_id):
            raise JobSedangBerjalan(f"lapisan {lapisan.value} masih berjalan")
        j = M.JobAnalitik(
            id=uuid7(),
            desa_id=desa_id,
            lapisan=lapisan.value,
            nama_job=nama,
            status=StatusJob.berjalan.value,
            mulai_pada=_now(),
        )
        return await self.job.simpan(j)

    async def _selesai_job(self, j: M.JobAnalitik, masuk: int, keluar: int, galat: str | None = None) -> None:
        j.status = StatusJob.gagal.value if galat else StatusJob.sukses.value
        j.baris_masuk = masuk
        j.baris_keluar = keluar
        j.selesai_pada = _now()
        j.galat = galat
        await self.job.simpan(j)

    async def _upsert_tambah(
        self, desa_id: UUID, tanggal: date, metrik: KodeMetrik, dimensi: dict, tambah: float,
    ) -> None:
        await self.agregat.upsert_tambah(desa_id, tanggal, metrik.value, dimensi, tambah)

    async def _proses_outbox(self, desa_id: UUID | None) -> tuple[int, int]:
        if self._sql:
            from app.repo.warta_genta_sql import RepoPeristiwaSQL
            q = select(M.Peristiwa).where(M.Peristiwa.diproses_pada.is_(None))
            if desa_id:
                q = q.where(M.Peristiwa.desa_id == desa_id)
            q = q.order_by(M.Peristiwa.dibuat_pada)
            res = await self.store.sesi.execute(q)
            belum = list(res.scalars().all())
        else:
            belum = await self.peristiwa.cari(desa_id=desa_id) if desa_id else await self.peristiwa.cari()
            belum = [p for p in belum if p.diproses_pada is None]
            belum.sort(key=lambda p: p.dibuat_pada)

        masuk = len(belum)
        keluar = 0
        for p in belum:
            m = p.muatan or {}
            tgl = _parse_tanggal(m, p.dibuat_pada)
            did = p.desa_id
            if p.jenis == JenisPeristiwaAnalitik.transaksi_settle.value:
                bruto = float(m.get("bruto", 0))
                reinvest = float(m.get("porsi_reinvestasi", 0))
                penyedia = str(m.get("penyedia_id", "unknown"))
                await self._upsert_tambah(did, tgl, KodeMetrik.pendapatan, {"penyedia_id": penyedia}, bruto)
                await self._upsert_tambah(did, tgl, KodeMetrik.kontribusi, {}, reinvest)
                keluar += 2
            elif p.jenis == JenisPeristiwaAnalitik.booking_selesai.value:
                jumlah = float(m.get("jumlah_orang", 1))
                dest = str(m.get("destinasi_id", "unknown"))
                await self._upsert_tambah(did, tgl, KodeMetrik.kunjungan, {"destinasi_id": dest}, jumlah)
                keluar += 1

            await self.peristiwa.tandai_diproses(p.id)
        return masuk, keluar

    async def _rollup_snapshot(self, desa_id: UUID) -> int:
        """Hitung ulang metrik snapshot dari tabel sumber (idempoten replace)."""
        keluar = 0
        if not self._sql:
            return keluar

        # umkm_aktif — jumlah UMKM dengan produk publik
        res = await self.store.sesi.execute(
            select(func.count(func.distinct(M.Umkm.id))).where(
                M.Umkm.desa_id == desa_id,
                M.Umkm.status_verifikasi == "terverifikasi",
            )
        )
        umkm_aktif = int(res.scalar_one() or 0)
        hari_ini = date.today()
        await self.agregat.set_nilai(desa_id, hari_ini, KodeMetrik.umkm_aktif.value, {}, umkm_aktif)
        keluar += 1

        # adopsi_regeneratif — owner dengan tingkat lumba_lumba
        res = await self.store.sesi.execute(
            select(func.count()).select_from(M.SertifikasiOwner).where(
                M.SertifikasiOwner.desa_id == desa_id,
                M.SertifikasiOwner.tingkat == "lumba_lumba",
            )
        )
        adopsi = int(res.scalar_one() or 0)
        await self.agregat.set_nilai(desa_id, hari_ini, KodeMetrik.adopsi_regeneratif.value, {}, adopsi)
        keluar += 1

        # booking_per_tingkat — rollup sederhana per tingkat (tanpa join berat)
        res = await self.store.sesi.execute(
            select(M.SertifikasiOwner.tingkat, func.count())
            .where(M.SertifikasiOwner.desa_id == desa_id)
            .group_by(M.SertifikasiOwner.tingkat)
        )
        for tingkat, cnt in res.all():
            await self.agregat.set_nilai(
                desa_id, hari_ini, KodeMetrik.booking_per_tingkat.value,
                {"tingkat": tingkat},
                float(cnt),
            )
            keluar += 1
        return keluar

    async def jalankan_gold(
        self, konteks: ctx.Konteks | None, desa_id: UUID | None = None,
    ) -> M.JobAnalitik:
        if konteks is not None:
            if desa_id is None:
                if not konteks.admin_global():
                    raise TidakBerwenang("Job global hanya admin.")
            else:
                ctx.wajib(konteks, rbac.JALANKAN_JOB_ANALITIK, desa_id)

        key = self._lock_key(Lapisan.gold.value, desa_id)
        locks: set[str] = self.store._job_analitik
        if key in locks:
            raise JobSedangBerjalan("Job gold sedang berjalan.")
        locks.add(key)
        j = await self.mulai_job(Lapisan.gold, desa_id, "outbox→gold")
        try:
            masuk, keluar = await self._proses_outbox(desa_id)
            if desa_id:
                keluar += await self._rollup_snapshot(desa_id)
            await self._selesai_job(j, masuk, keluar)
        except Exception as exc:
            await self._selesai_job(j, 0, 0, galat=str(exc))
            raise
        finally:
            locks.discard(key)
        return j

    async def baca(
        self,
        konteks: ctx.Konteks | None,
        desa_id: UUID,
        kode_metrik: str,
        dari: date,
        sampai: date,
        dimensi: dict | None = None,
        *,
        owner_id: UUID | None = None,
    ) -> list[M.AgregatHarian]:
        try:
            metrik = KodeMetrik(kode_metrik)
        except ValueError:
            raise MetrikTidakDikenal(kode_metrik)

        if metrik == KodeMetrik.booking_per_tingkat and owner_id:
            ctx.wajib(konteks, rbac.BACA_AGREGAT_OWNER, desa_id)
            dimensi = {**(dimensi or {}), "penyedia_id": str(owner_id)}
        else:
            ctx.wajib(konteks, rbac.BACA_AGREGAT_PENGELOLA, desa_id)

        return await self.agregat.daftar(
            desa_id, kode_metrik=kode_metrik, dari=dari, sampai=sampai, dimensi=dimensi,
        )

    async def ringkas(self, konteks: ctx.Konteks, desa_id: UUID, periode: str) -> dict:
        ctx.wajib(konteks, rbac.BACA_AGREGAT_PENGELOLA, desa_id)
        y, m = map(int, periode.split("-"))
        dari = date(y, m, 1)
        sampai = date(y, m, monthrange(y, m)[1])
        metrik_out: dict = {}
        terbaru: datetime | None = None
        for km in METRIK_PKM:
            rows = await self.agregat.daftar(desa_id, kode_metrik=km.value, dari=dari, sampai=sampai)
            if not rows:
                continue
            total = sum(float(r.nilai) for r in rows)
            if km in (KodeMetrik.umkm_aktif, KodeMetrik.adopsi_regeneratif):
                nilai = float(rows[-1].nilai)
            else:
                nilai = total
            metrik_out[km.value] = {
                "total": nilai,
                "series": [
                    {"tanggal": r.tanggal.isoformat(), "nilai": float(r.nilai), "dimensi": r.dimensi or {}}
                    for r in rows
                ],
            }
            for r in rows:
                if r.diperbarui_pada and (terbaru is None or r.diperbarui_pada > terbaru):
                    terbaru = r.diperbarui_pada
        return {
            "periode": periode,
            "metrik": metrik_out,
            "diperbarui_pada": terbaru.isoformat() if terbaru else None,
        }

    async def total_metrik(
        self, desa_id: UUID, kode_metrik: str, dari: date, sampai: date,
    ) -> float:
        rows = await self.agregat.daftar(desa_id, kode_metrik=kode_metrik, dari=dari, sampai=sampai)
        return sum(float(r.nilai) for r in rows)

    async def daftar_job(
        self,
        konteks: ctx.Konteks,
        *,
        lapisan: str | None = None,
        status: str | None = None,
        desa_id: UUID | None = None,
    ) -> list[M.JobAnalitik]:
        if desa_id is None and not konteks.admin_global():
            ctx.wajib(konteks, rbac.BACA_JOB_ANALITIK, desa_id)
        elif desa_id:
            ctx.wajib(konteks, rbac.BACA_JOB_ANALITIK, desa_id)
        else:
            if not konteks.admin_global():
                raise TidakBerwenang()
        return await self.job.daftar(lapisan=lapisan, status=status, desa_id=desa_id)

    async def detail_job(self, konteks: ctx.Konteks, job_id: UUID) -> M.JobAnalitik:
        if not konteks.admin_global():
            raise TidakBerwenang()
        row = await self.job.ambil(job_id)
        if row is None:
            raise TidakDitemukan("Job tidak ditemukan.")
        return row
