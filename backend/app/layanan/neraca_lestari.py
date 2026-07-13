"""Jejak Lestari — neraca lestari (KPI setara GMV, anti-greenwashing)."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from app.domain import konteks as ctx
from app.domain import rbac
from app.domain.errors import JobSedangBerjalan, PeriodeFinal, TidakDitemukan
from app.f3.enums import StatusMonitoring
from app.f3.konfig import BobotNeracaLestari
from app.f3.peta_klaim import indikator_dari_klaim
from app.f3.util import uuid7
from app.model import tabel as M


def _now() -> datetime:
    return datetime.now(timezone.utc)


class NeracaLestariLayanan:
    def __init__(self, store, bobot: BobotNeracaLestari | None = None):
        self.store = store
        self.neraca = store.neraca_regeneratif
        self.monitoring = store.monitoring
        self.indikator = store.indikator
        self.bobot = bobot or BobotNeracaLestari()
        self._sql = getattr(store, "sesi", None) is not None

    def _transaksi_repo(self):
        if self._sql:
            from app.repo.f2_sql import RepoTransaksiSQL
            return RepoTransaksiSQL(self.store.sesi)
        return self.store.transaksi_neraca

    def _stempel_repo(self):
        if self._sql:
            from app.repo.f2_sql import RepoStempelSQL
            return RepoStempelSQL(self.store.sesi)
        return self.store.stempel_neraca

    async def daftar(
        self,
        konteks: ctx.Konteks | None,
        desa_id: UUID,
        *,
        dari: str | None = None,
        sampai: str | None = None,
        publik: bool = False,
    ) -> list[M.NeracaRegeneratif]:
        if not publik:
            ctx.wajib(konteks, rbac.BACA_NERACA_PENGELOLA, desa_id)
        return await self.neraca.daftar(desa_id, dari=dari, sampai=sampai)

    async def detail(
        self,
        konteks: ctx.Konteks | None,
        desa_id: UUID,
        periode: str,
        publik: bool = False,
    ) -> M.NeracaRegeneratif:
        if not publik:
            ctx.wajib(konteks, rbac.BACA_NERACA_PENGELOLA, desa_id)
        row = await self.neraca.ambil_periode(desa_id, periode)
        if row is None:
            raise TidakDitemukan("Neraca tidak ditemukan.")
        return row

    async def hitung(self, konteks: ctx.Konteks, desa_id: UUID, periode: str) -> M.NeracaRegeneratif:
        ctx.wajib(konteks, rbac.HITUNG_NERACA, desa_id)
        key = f"{desa_id}:{periode}"
        locks: set[str] = self.store._job_neraca
        if key in locks:
            raise JobSedangBerjalan("Hitung neraca sedang berjalan.")
        locks.add(key)
        try:
            ada = await self.neraca.ambil_periode(desa_id, periode)
            if ada and ada.terkunci:
                raise PeriodeFinal(f"Neraca {periode} terkunci.")

            b = self.bobot
            mons = await self.monitoring.daftar(
                desa_id, status=StatusMonitoring.terverifikasi.value,
            )
            mons = [m for m in mons if m.waktu_ukur.strftime("%Y-%m") == periode]
            indikator_terverifikasi: set[str] = set()
            for m in mons:
                indi = await self.indikator.ambil(desa_id, m.indikator_id)
                if indi:
                    indikator_terverifikasi.add(indi.kode)
            skor_ekologi = min(1.0, len(indikator_terverifikasi) / b.target_indikator)

            klaim_diklaim = 0
            klaim_tervalidasi = 0
            if self._sql:
                from sqlalchemy import select
                res = await self.store.sesi.execute(
                    select(M.Stempel).where(
                        M.Stempel.desa_id == desa_id,
                        M.Stempel.status == "terverifikasi",
                    )
                )
                stempels = [
                    s for s in res.scalars().all()
                    if s.dibuat_pada and s.dibuat_pada.strftime("%Y-%m") == periode
                ]
            else:
                stempels = await self._stempel_repo().daftar_terverifikasi_periode(desa_id, periode)
            for s in stempels:
                for kunci, n in (s.dampak or {}).items():
                    klaim_diklaim += int(n)
                    kode_ind = indikator_dari_klaim(kunci)
                    if kode_ind and kode_ind in indikator_terverifikasi:
                        klaim_tervalidasi += int(n)

            if self._sql:
                trx_rows = await self._transaksi_repo().daftar(desa_id, status="dirilis")
                trx = [t for t in trx_rows if t.dibuat_pada.strftime("%Y-%m") == periode]
            else:
                trx = await self._transaksi_repo().daftar_periode(desa_id, periode)
            penyedia_lokal = {t.penyedia_id for t in trx}
            skor_sosial = min(1.0, len(penyedia_lokal) / b.target_penyedia_lokal)
            gmv = float(sum(t.bruto for t in trx))
            skor_ekonomi = min(1.0, gmv / b.target_gmv) if b.target_gmv else 0.0
            skor_total = b.ekologi * skor_ekologi + b.sosial * skor_sosial + b.ekonomi * skor_ekonomi

            komponen = {
                "indikator_terverifikasi": sorted(indikator_terverifikasi),
                "klaim_dampak_diklaim": klaim_diklaim,
                "klaim_dampak_tervalidasi": klaim_tervalidasi,
                "penyedia_lokal": len(penyedia_lokal),
                "gmv": gmv,
                "bobot": {"ekologi": b.ekologi, "sosial": b.sosial, "ekonomi": b.ekonomi},
            }

            n = M.NeracaRegeneratif(
                id=ada.id if ada else uuid7(),
                desa_id=desa_id,
                periode=periode,
                skor_ekologi=Decimal(str(round(skor_ekologi, 6))),
                skor_sosial=Decimal(str(round(skor_sosial, 6))),
                skor_ekonomi=Decimal(str(round(skor_ekonomi, 6))),
                skor_total=Decimal(str(round(skor_total, 6))),
                komponen=komponen,
                terkunci=ada.terkunci if ada else False,
                dibuat_pada=_now(),
            )
            return await self.neraca.simpan(n)
        finally:
            locks.discard(key)

    async def kunci(self, konteks: ctx.Konteks, desa_id: UUID, periode: str) -> M.NeracaRegeneratif:
        ctx.wajib(konteks, rbac.HITUNG_NERACA, desa_id)
        return await self.neraca.kunci(desa_id, periode)
