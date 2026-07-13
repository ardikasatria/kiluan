"""Repo SQL F3 — indikator, monitoring, dana konservasi."""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, or_, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import TidakDitemukan
from app.f3.util import uuid7
from app.model import tabel as M


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _set_lokasi_monitoring(s: AsyncSession, monitoring_id: UUID, lat: float, lng: float) -> None:
    await s.execute(
        text(
            "UPDATE monitoring_ekologi SET lokasi = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography "
            "WHERE id = :id"
        ),
        {"id": str(monitoring_id), "lat": lat, "lng": lng},
    )


async def dalam_geofence_destinasi(
    s: AsyncSession, destinasi_id: UUID, lat: float, lng: float, radius_m: float,
) -> bool:
    res = await s.execute(
        text(
            "SELECT ST_DWithin("
            "  d.lokasi, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius"
            ") FROM destinasi d WHERE d.id = :id"
        ),
        {"id": str(destinasi_id), "lat": lat, "lng": lng, "radius": radius_m},
    )
    return bool(res.scalar())


class RepoIndikatorSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def daftar(self, desa_id: UUID, *, aktif_only: bool = True) -> list[M.IndikatorEkologi]:
        q = select(M.IndikatorEkologi).where(
            or_(M.IndikatorEkologi.desa_id.is_(None), M.IndikatorEkologi.desa_id == desa_id),
        )
        if aktif_only:
            q = q.where(M.IndikatorEkologi.aktif.is_(True))
        res = await self.s.execute(q.order_by(M.IndikatorEkologi.id))
        return list(res.scalars().all())

    async def ambil(self, desa_id: UUID, indikator_id: int) -> Optional[M.IndikatorEkologi]:
        row = await self.s.get(M.IndikatorEkologi, indikator_id)
        if row is None:
            return None
        if row.desa_id is not None and row.desa_id != desa_id:
            return None
        return row

    async def simpan(self, ind: M.IndikatorEkologi) -> M.IndikatorEkologi:
        self.s.add(ind)
        await self.s.flush()
        return ind


class RepoMonitoringSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(
        self, m: M.MonitoringEkologi, lat: float | None = None, lng: float | None = None,
    ) -> M.MonitoringEkologi:
        self.s.add(m)
        await self.s.flush()
        if lat is not None and lng is not None:
            await _set_lokasi_monitoring(self.s, m.id, lat, lng)
        return m

    async def simpan_idempoten(
        self, m: M.MonitoringEkologi, lat: float | None = None, lng: float | None = None,
    ) -> tuple[M.MonitoringEkologi | None, bool]:
        """Insert ON CONFLICT DO NOTHING. Return (row, created)."""
        vals = {
            "id": m.id,
            "desa_id": m.desa_id,
            "indikator_id": m.indikator_id,
            "destinasi_id": m.destinasi_id,
            "nilai": m.nilai,
            "waktu_ukur": m.waktu_ukur,
            "pencatat_id": m.pencatat_id,
            "metode": m.metode,
            "media_id": m.media_id,
            "status": m.status,
            "catatan": m.catatan,
            "dibuat_pada": m.dibuat_pada,
        }
        stmt = insert(M.MonitoringEkologi).values(**vals).on_conflict_do_nothing(index_elements=["id"])
        res = await self.s.execute(stmt)
        if res.rowcount == 0:
            ada = await self.ambil(m.desa_id, m.id)
            return ada, False
        if lat is not None and lng is not None:
            await _set_lokasi_monitoring(self.s, m.id, lat, lng)
        return await self.ambil(m.desa_id, m.id), True

    async def ambil(self, desa_id: UUID, monitoring_id: UUID) -> Optional[M.MonitoringEkologi]:
        row = await self.s.get(M.MonitoringEkologi, monitoring_id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, desa_id: UUID, monitoring_id: UUID) -> M.MonitoringEkologi:
        row = await self.ambil(desa_id, monitoring_id)
        if row is None:
            raise TidakDitemukan("Monitoring tidak ditemukan.")
        return row

    async def daftar(
        self,
        desa_id: UUID,
        *,
        indikator_id: int | None = None,
        destinasi_id: UUID | None = None,
        status: str | None = None,
        pencatat_id: UUID | None = None,
        dari: date | None = None,
        sampai: date | None = None,
    ) -> list[M.MonitoringEkologi]:
        q = select(M.MonitoringEkologi).where(M.MonitoringEkologi.desa_id == desa_id)
        if indikator_id is not None:
            q = q.where(M.MonitoringEkologi.indikator_id == indikator_id)
        if destinasi_id is not None:
            q = q.where(M.MonitoringEkologi.destinasi_id == destinasi_id)
        if status:
            q = q.where(M.MonitoringEkologi.status == status)
        if pencatat_id is not None:
            q = q.where(M.MonitoringEkologi.pencatat_id == pencatat_id)
        if dari:
            q = q.where(M.MonitoringEkologi.waktu_ukur >= dari)
        if sampai:
            q = q.where(M.MonitoringEkologi.waktu_ukur <= sampai)
        res = await self.s.execute(q.order_by(M.MonitoringEkologi.dibuat_pada.desc()))
        return list(res.scalars().all())

    async def verifikasi_untuk(self, desa_id: UUID, monitoring_id: UUID) -> Optional[M.Verifikasi]:
        res = await self.s.execute(
            select(M.Verifikasi).where(
                M.Verifikasi.desa_id == desa_id,
                M.Verifikasi.entitas_tipe == "monitoring_ekologi",
                M.Verifikasi.entitas_id == monitoring_id,
            ).limit(1)
        )
        return res.scalar_one_or_none()


class RepoDanaKonservasiSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, entri: M.DanaKonservasi) -> M.DanaKonservasi:
        self.s.add(entri)
        await self.s.flush()
        return entri

    async def inflow_idempoten(self, entri: M.DanaKonservasi) -> tuple[M.DanaKonservasi, bool]:
        """ON CONFLICT partial unique → return (row, created)."""
        vals = {
            "id": entri.id,
            "desa_id": entri.desa_id,
            "jenis": entri.jenis,
            "sumber_tipe": entri.sumber_tipe,
            "sumber_id": entri.sumber_id,
            "jumlah": entri.jumlah,
            "tanggal": entri.tanggal,
            "dicatat_oleh": entri.dicatat_oleh,
            "keterangan": entri.keterangan,
            "dibuat_pada": entri.dibuat_pada,
        }
        stmt = (
            insert(M.DanaKonservasi)
            .values(**vals)
            .on_conflict_do_nothing(
                index_elements=["sumber_tipe", "sumber_id"],
                index_where=text("sumber_tipe = 'transaksi'"),
            )
        )
        res = await self.s.execute(stmt)
        if res.rowcount == 0:
            ada = await self.ambil_sumber(entri.desa_id, entri.sumber_tipe, entri.sumber_id)
            return ada, False  # type: ignore[return-value]
        return entri, True

    async def ambil(self, desa_id: UUID, entri_id: UUID) -> Optional[M.DanaKonservasi]:
        row = await self.s.get(M.DanaKonservasi, entri_id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, desa_id: UUID, entri_id: UUID) -> M.DanaKonservasi:
        row = await self.ambil(desa_id, entri_id)
        if row is None:
            raise TidakDitemukan("Entri dana konservasi tidak ditemukan.")
        return row

    async def ambil_sumber(
        self, desa_id: UUID, sumber_tipe: str | None, sumber_id: UUID | None,
    ) -> Optional[M.DanaKonservasi]:
        if sumber_tipe is None or sumber_id is None:
            return None
        res = await self.s.execute(
            select(M.DanaKonservasi).where(
                M.DanaKonservasi.desa_id == desa_id,
                M.DanaKonservasi.sumber_tipe == sumber_tipe,
                M.DanaKonservasi.sumber_id == sumber_id,
            ).limit(1)
        )
        return res.scalar_one_or_none()

    async def daftar(
        self,
        desa_id: UUID,
        *,
        jenis: str | None = None,
        kategori: str | None = None,
        dari: date | None = None,
        sampai: date | None = None,
    ) -> list[M.DanaKonservasi]:
        q = select(M.DanaKonservasi).where(M.DanaKonservasi.desa_id == desa_id)
        if jenis:
            q = q.where(M.DanaKonservasi.jenis == jenis)
        if kategori:
            q = q.where(M.DanaKonservasi.kategori == kategori)
        if dari:
            q = q.where(M.DanaKonservasi.tanggal >= dari)
        if sampai:
            q = q.where(M.DanaKonservasi.tanggal <= sampai)
        res = await self.s.execute(q.order_by(M.DanaKonservasi.tanggal.desc(), M.DanaKonservasi.dibuat_pada.desc()))
        return list(res.scalars().all())

    async def saldo(self, desa_id: UUID) -> dict:
        entri = await self.daftar(desa_id)
        masuk = sum((e.jumlah for e in entri if e.jenis == "masuk"), Decimal(0))
        keluar = sum((e.jumlah for e in entri if e.jenis == "keluar"), Decimal(0))
        per_kategori: dict[str, Decimal] = {}
        per_sumber: dict[str, Decimal] = {}
        for e in entri:
            if e.jenis == "keluar" and e.kategori:
                per_kategori[e.kategori] = per_kategori.get(e.kategori, Decimal(0)) + e.jumlah
            if e.jenis == "masuk" and e.sumber_tipe:
                per_sumber[e.sumber_tipe] = per_sumber.get(e.sumber_tipe, Decimal(0)) + e.jumlah
        terakhir = max((e.dibuat_pada for e in entri), default=None)
        return {
            "saldo": masuk - keluar,
            "total_masuk": masuk,
            "total_keluar": keluar,
            "per_kategori": {k: float(v) for k, v in per_kategori.items()},
            "per_sumber": {k: float(v) for k, v in per_sumber.items()},
            "diperbarui_pada": terakhir.isoformat() if terakhir else None,
        }


class RepoDayaDukungSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def daftar(self, desa_id: UUID) -> list[M.DayaDukung]:
        res = await self.s.execute(
            select(M.DayaDukung).where(M.DayaDukung.desa_id == desa_id).order_by(M.DayaDukung.diperbarui_pada.desc())
        )
        return list(res.scalars().all())

    async def ambil_destinasi(self, desa_id: UUID, destinasi_id: UUID) -> M.DayaDukung | None:
        res = await self.s.execute(
            select(M.DayaDukung).where(
                M.DayaDukung.desa_id == desa_id,
                M.DayaDukung.destinasi_id == destinasi_id,
            ).limit(1)
        )
        return res.scalar_one_or_none()

    async def upsert(self, dd: M.DayaDukung) -> M.DayaDukung:
        vals = {
            "id": dd.id,
            "desa_id": dd.desa_id,
            "destinasi_id": dd.destinasi_id,
            "kapasitas_harian": dd.kapasitas_harian,
            "ambang_kuning": dd.ambang_kuning,
            "ambang_merah": dd.ambang_merah,
            "metode_hitung": dd.metode_hitung,
            "diperbarui_pada": dd.diperbarui_pada,
        }
        stmt = (
            insert(M.DayaDukung)
            .values(**vals)
            .on_conflict_do_update(
                index_elements=["destinasi_id"],
                set_={
                    "kapasitas_harian": dd.kapasitas_harian,
                    "ambang_kuning": dd.ambang_kuning,
                    "ambang_merah": dd.ambang_merah,
                    "metode_hitung": dd.metode_hitung,
                    "diperbarui_pada": dd.diperbarui_pada,
                },
            )
        )
        await self.s.execute(stmt)
        await self.s.flush()
        row = await self.ambil_destinasi(dd.desa_id, dd.destinasi_id)
        return row  # type: ignore[return-value]


class RepoPemakaianKapasitasSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def ambil(
        self, desa_id: UUID, destinasi_id: UUID, tanggal: date,
    ) -> M.PemakaianKapasitas | None:
        res = await self.s.execute(
            select(M.PemakaianKapasitas).where(
                M.PemakaianKapasitas.desa_id == desa_id,
                M.PemakaianKapasitas.destinasi_id == destinasi_id,
                M.PemakaianKapasitas.tanggal == tanggal,
            ).limit(1)
        )
        return res.scalar_one_or_none()

    async def daftar(
        self,
        desa_id: UUID,
        *,
        destinasi_id: UUID | None = None,
        dari: date | None = None,
        sampai: date | None = None,
    ) -> list[M.PemakaianKapasitas]:
        q = select(M.PemakaianKapasitas).where(M.PemakaianKapasitas.desa_id == desa_id)
        if destinasi_id:
            q = q.where(M.PemakaianKapasitas.destinasi_id == destinasi_id)
        if dari:
            q = q.where(M.PemakaianKapasitas.tanggal >= dari)
        if sampai:
            q = q.where(M.PemakaianKapasitas.tanggal <= sampai)
        res = await self.s.execute(q.order_by(M.PemakaianKapasitas.tanggal.desc()))
        return list(res.scalars().all())

    async def upsert(self, pk: M.PemakaianKapasitas) -> M.PemakaianKapasitas:
        vals = {
            "id": pk.id,
            "desa_id": pk.desa_id,
            "destinasi_id": pk.destinasi_id,
            "tanggal": pk.tanggal,
            "kunjungan": pk.kunjungan,
            "kapasitas_harian": pk.kapasitas_harian,
            "rasio": pk.rasio,
            "level": pk.level,
            "dihitung_pada": pk.dihitung_pada,
        }
        stmt = (
            insert(M.PemakaianKapasitas)
            .values(**vals)
            .on_conflict_do_update(
                index_elements=["destinasi_id", "tanggal"],
                set_={
                    "kunjungan": pk.kunjungan,
                    "kapasitas_harian": pk.kapasitas_harian,
                    "rasio": pk.rasio,
                    "level": pk.level,
                    "dihitung_pada": pk.dihitung_pada,
                },
            )
        )
        await self.s.execute(stmt)
        await self.s.flush()
        row = await self.ambil(pk.desa_id, pk.destinasi_id, pk.tanggal)
        return row  # type: ignore[return-value]


class RepoKunjunganSQL:
    """Hitung kunjungan harian per destinasi (booking + stempel terverifikasi)."""

    def __init__(self, s: AsyncSession):
        self.s = s

    async def hitung(self, desa_id: UUID, destinasi_id: UUID, tanggal: date) -> int:
        res_booking = await self.s.execute(
            select(M.Booking.jumlah_orang).where(
                M.Booking.desa_id == desa_id,
                M.Booking.destinasi_id == destinasi_id,
                M.Booking.tanggal_kunjungan == tanggal,
                M.Booking.status.in_(("dipesan", "checkin", "selesai")),
            )
        )
        dari_booking = sum(int(r[0]) for r in res_booking.all())

        res_stempel = await self.s.execute(
            text(
                "SELECT s.id FROM stempel s "
                "JOIN stasiun_lestari sl ON s.stasiun_id = sl.id "
                "WHERE s.desa_id = :desa_id AND s.status = 'terverifikasi' "
                "AND sl.destinasi_id = :destinasi_id AND DATE(s.dibuat_pada) = :tgl"
            ),
            {"desa_id": str(desa_id), "destinasi_id": str(destinasi_id), "tgl": tanggal},
        )
        dari_stempel = len(res_stempel.all())
        return dari_booking + dari_stempel


class RepoNeracaRegeneratifSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def ambil_periode(self, desa_id: UUID, periode: str) -> M.NeracaRegeneratif | None:
        res = await self.s.execute(
            select(M.NeracaRegeneratif).where(
                M.NeracaRegeneratif.desa_id == desa_id,
                M.NeracaRegeneratif.periode == periode,
            ).limit(1)
        )
        return res.scalar_one_or_none()

    async def daftar(
        self, desa_id: UUID, *, dari: str | None = None, sampai: str | None = None,
    ) -> list[M.NeracaRegeneratif]:
        q = select(M.NeracaRegeneratif).where(M.NeracaRegeneratif.desa_id == desa_id)
        if dari:
            q = q.where(M.NeracaRegeneratif.periode >= dari)
        if sampai:
            q = q.where(M.NeracaRegeneratif.periode <= sampai)
        res = await self.s.execute(q.order_by(M.NeracaRegeneratif.periode.desc()))
        return list(res.scalars().all())

    async def simpan(self, n: M.NeracaRegeneratif) -> M.NeracaRegeneratif:
        ada = await self.ambil_periode(n.desa_id, n.periode)
        if ada and ada.terkunci:
            from app.domain.errors import PeriodeFinal
            raise PeriodeFinal(f"Neraca {n.periode} terkunci.")
        if ada:
            ada.skor_ekologi = n.skor_ekologi
            ada.skor_sosial = n.skor_sosial
            ada.skor_ekonomi = n.skor_ekonomi
            ada.skor_total = n.skor_total
            ada.komponen = n.komponen
            ada.dibuat_pada = n.dibuat_pada
            await self.s.flush()
            return ada
        self.s.add(n)
        await self.s.flush()
        return n

    async def kunci(self, desa_id: UUID, periode: str) -> M.NeracaRegeneratif:
        row = await self.ambil_periode(desa_id, periode)
        if row is None:
            raise TidakDitemukan("Neraca tidak ditemukan.")
        row.terkunci = True
        await self.s.flush()
        return row


class RepoAgregatSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def upsert_tambah(
        self, desa_id: UUID, tanggal: date, kode_metrik: str, dimensi: dict, tambah: float,
    ) -> M.AgregatHarian:
        from sqlalchemy.dialects.postgresql import insert
        dim = dict(dimensi or {})
        stmt = insert(M.AgregatHarian).values(
            id=uuid7(),
            desa_id=desa_id,
            tanggal=tanggal,
            kode_metrik=kode_metrik,
            dimensi=dim,
            nilai=Decimal(str(tambah)),
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_agregat_baris",
            set_={
                "nilai": M.AgregatHarian.nilai + Decimal(str(tambah)),
                "diperbarui_pada": _now(),
            },
        )
        await self.s.execute(stmt)
        await self.s.flush()
        res = await self.s.execute(
            select(M.AgregatHarian).where(
                M.AgregatHarian.desa_id == desa_id,
                M.AgregatHarian.tanggal == tanggal,
                M.AgregatHarian.kode_metrik == kode_metrik,
                M.AgregatHarian.dimensi == dim,
            )
        )
        return res.scalar_one()

    async def set_nilai(
        self, desa_id: UUID, tanggal: date, kode_metrik: str, dimensi: dict, nilai: float,
    ) -> M.AgregatHarian:
        from sqlalchemy.dialects.postgresql import insert
        dim = dict(dimensi or {})
        stmt = insert(M.AgregatHarian).values(
            id=uuid7(),
            desa_id=desa_id,
            tanggal=tanggal,
            kode_metrik=kode_metrik,
            dimensi=dim,
            nilai=Decimal(str(nilai)),
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_agregat_baris",
            set_={"nilai": Decimal(str(nilai)), "diperbarui_pada": _now()},
        )
        await self.s.execute(stmt)
        await self.s.flush()
        res = await self.s.execute(
            select(M.AgregatHarian).where(
                M.AgregatHarian.desa_id == desa_id,
                M.AgregatHarian.tanggal == tanggal,
                M.AgregatHarian.kode_metrik == kode_metrik,
                M.AgregatHarian.dimensi == dim,
            )
        )
        return res.scalar_one()

    async def daftar(
        self,
        desa_id: UUID,
        *,
        kode_metrik: str | None = None,
        dari: date | None = None,
        sampai: date | None = None,
        dimensi: dict | None = None,
    ) -> list[M.AgregatHarian]:
        q = select(M.AgregatHarian).where(M.AgregatHarian.desa_id == desa_id)
        if kode_metrik:
            q = q.where(M.AgregatHarian.kode_metrik == kode_metrik)
        if dari:
            q = q.where(M.AgregatHarian.tanggal >= dari)
        if sampai:
            q = q.where(M.AgregatHarian.tanggal <= sampai)
        if dimensi is not None:
            q = q.where(M.AgregatHarian.dimensi == dict(dimensi))
        res = await self.s.execute(q.order_by(M.AgregatHarian.tanggal))
        return list(res.scalars().all())


class RepoJobAnalitikSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, j: M.JobAnalitik) -> M.JobAnalitik:
        row = await self.s.get(M.JobAnalitik, j.id)
        if row is None:
            self.s.add(j)
        else:
            row.status = j.status
            row.baris_masuk = j.baris_masuk
            row.baris_keluar = j.baris_keluar
            row.selesai_pada = j.selesai_pada
            row.galat = j.galat
        await self.s.flush()
        return j

    async def ambil(self, job_id: UUID) -> M.JobAnalitik | None:
        return await self.s.get(M.JobAnalitik, job_id)

    async def daftar(
        self,
        *,
        lapisan: str | None = None,
        status: str | None = None,
        desa_id: UUID | None = None,
    ) -> list[M.JobAnalitik]:
        q = select(M.JobAnalitik)
        if lapisan:
            q = q.where(M.JobAnalitik.lapisan == lapisan)
        if status:
            q = q.where(M.JobAnalitik.status == status)
        if desa_id is not None:
            q = q.where(M.JobAnalitik.desa_id == desa_id)
        res = await self.s.execute(q.order_by(M.JobAnalitik.mulai_pada.desc()))
        return list(res.scalars().all())


class RepoLaporanSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, lap: M.LaporanBulanan) -> M.LaporanBulanan:
        self.s.add(lap)
        await self.s.flush()
        return lap

    async def ambil(self, desa_id: UUID, laporan_id: UUID) -> M.LaporanBulanan | None:
        row = await self.s.get(M.LaporanBulanan, laporan_id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def ambil_periode(self, desa_id: UUID, periode: str) -> M.LaporanBulanan | None:
        res = await self.s.execute(
            select(M.LaporanBulanan).where(
                M.LaporanBulanan.desa_id == desa_id,
                M.LaporanBulanan.periode == periode,
            )
        )
        return res.scalar_one_or_none()

    async def daftar(
        self, desa_id: UUID, *, periode: str | None = None, status: str | None = None,
    ) -> list[M.LaporanBulanan]:
        q = select(M.LaporanBulanan).where(M.LaporanBulanan.desa_id == desa_id)
        if periode:
            q = q.where(M.LaporanBulanan.periode == periode)
        if status:
            q = q.where(M.LaporanBulanan.status == status)
        res = await self.s.execute(q.order_by(M.LaporanBulanan.periode.desc()))
        return list(res.scalars().all())

