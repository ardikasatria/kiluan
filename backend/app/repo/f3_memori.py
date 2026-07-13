"""Repo in-memory F3 — uji domain tanpa DB."""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Callable, Generic, List, Optional, TypeVar
from uuid import UUID

from app.domain.errors import TidakDitemukan
from app.model import tabel as M

T = TypeVar("T")


class RepoMemoriF3(Generic[T]):
    def __init__(self, id_getter: Callable[[T], object], desa_getter: Callable[[T], Optional[UUID]]):
        self._data: dict = {}
        self._id = id_getter
        self._desa = desa_getter

    async def simpan(self, ent: T) -> T:
        self._data[self._id(ent)] = ent
        return ent

    async def ambil(self, desa_id: Optional[UUID], ent_id) -> Optional[T]:
        ent = self._data.get(ent_id)
        if ent is None:
            return None
        d = self._desa(ent)
        if d is not None and desa_id is not None and d != desa_id:
            return None
        return ent

    async def daftar(self, desa_id: Optional[UUID], predikat: Optional[Callable[[T], bool]] = None) -> List[T]:
        out = []
        for ent in self._data.values():
            d = self._desa(ent)
            if desa_id is not None and d is not None and d != desa_id:
                continue
            if predikat and not predikat(ent):
                continue
            out.append(ent)
        return out


class RepoIndikatorMemori:
    def __init__(self):
        self._seq = 0
        self._rows: dict[int, M.IndikatorEkologi] = {}

    async def daftar(self, desa_id: UUID, *, aktif_only: bool = True) -> list[M.IndikatorEkologi]:
        out = []
        for row in self._rows.values():
            if row.desa_id not in (None, desa_id):
                continue
            if aktif_only and not row.aktif:
                continue
            out.append(row)
        return sorted(out, key=lambda r: r.id)

    async def ambil(self, desa_id: UUID, indikator_id: int) -> Optional[M.IndikatorEkologi]:
        row = self._rows.get(indikator_id)
        if row is None:
            return None
        if row.desa_id is not None and row.desa_id != desa_id:
            return None
        return row

    async def simpan(self, ind: M.IndikatorEkologi) -> M.IndikatorEkologi:
        if ind.id == 0:
            self._seq += 1
            ind.id = self._seq
        self._rows[ind.id] = ind
        return ind


class RepoMonitoringMemori:
    def __init__(self):
        self._rows: dict[UUID, M.MonitoringEkologi] = {}
        self._lokasi: dict[UUID, tuple[float, float]] = {}

    async def simpan(
        self, m: M.MonitoringEkologi, lat: float | None = None, lng: float | None = None,
    ) -> M.MonitoringEkologi:
        self._rows[m.id] = m
        if lat is not None and lng is not None:
            self._lokasi[m.id] = (lat, lng)
        return m

    async def simpan_idempoten(
        self, m: M.MonitoringEkologi, lat: float | None = None, lng: float | None = None,
    ) -> tuple[M.MonitoringEkologi | None, bool]:
        if m.id in self._rows:
            return self._rows[m.id], False
        await self.simpan(m, lat, lng)
        return m, True

    async def ambil(self, desa_id: UUID, monitoring_id: UUID) -> Optional[M.MonitoringEkologi]:
        row = self._rows.get(monitoring_id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, desa_id: UUID, monitoring_id: UUID) -> M.MonitoringEkologi:
        row = await self.ambil(desa_id, monitoring_id)
        if row is None:
            raise TidakDitemukan("Monitoring tidak ditemukan.")
        return row

    async def daftar(self, desa_id: UUID, **filters) -> list[M.MonitoringEkologi]:
        def cocok(m: M.MonitoringEkologi) -> bool:
            if m.desa_id != desa_id:
                return False
            if filters.get("indikator_id") and m.indikator_id != filters["indikator_id"]:
                return False
            if filters.get("destinasi_id") and m.destinasi_id != filters["destinasi_id"]:
                return False
            if filters.get("status") and m.status != filters["status"]:
                return False
            if filters.get("pencatat_id") and m.pencatat_id != filters["pencatat_id"]:
                return False
            if filters.get("dari") and m.waktu_ukur < filters["dari"]:
                return False
            if filters.get("sampai") and m.waktu_ukur > filters["sampai"]:
                return False
            return True

        return sorted(
            [m for m in self._rows.values() if cocok(m)],
            key=lambda x: x.dibuat_pada or date.min,
            reverse=True,
        )

    def lokasi(self, monitoring_id: UUID) -> tuple[float, float] | None:
        return self._lokasi.get(monitoring_id)

    async def verifikasi_untuk(self, desa_id: UUID, monitoring_id: UUID) -> Optional[M.Verifikasi]:
        return None  # diisi lewat repo verifikasi terpisah di test


class RepoDanaKonservasiMemori:
    def __init__(self):
        self._rows: dict[UUID, M.DanaKonservasi] = {}

    async def simpan(self, entri: M.DanaKonservasi) -> M.DanaKonservasi:
        self._rows[entri.id] = entri
        return entri

    async def inflow_idempoten(self, entri: M.DanaKonservasi) -> tuple[M.DanaKonservasi, bool]:
        for e in self._rows.values():
            if (
                e.desa_id == entri.desa_id
                and e.sumber_tipe == entri.sumber_tipe
                and e.sumber_id == entri.sumber_id
            ):
                return e, False
        await self.simpan(entri)
        return entri, True

    async def ambil(self, desa_id: UUID, entri_id: UUID) -> Optional[M.DanaKonservasi]:
        row = self._rows.get(entri_id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, desa_id: UUID, entri_id: UUID) -> M.DanaKonservasi:
        row = await self.ambil(desa_id, entri_id)
        if row is None:
            raise TidakDitemukan("Entri dana konservasi tidak ditemukan.")
        return row

    async def daftar(self, desa_id: UUID, **filters) -> list[M.DanaKonservasi]:
        def cocok(e: M.DanaKonservasi) -> bool:
            if e.desa_id != desa_id:
                return False
            if filters.get("jenis") and e.jenis != filters["jenis"]:
                return False
            if filters.get("kategori") and e.kategori != filters["kategori"]:
                return False
            return True

        return sorted(
            [e for e in self._rows.values() if cocok(e)],
            key=lambda x: (x.tanggal, x.dibuat_pada or date.min),
            reverse=True,
        )

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
            "saldo": float(masuk - keluar),
            "total_masuk": float(masuk),
            "total_keluar": float(keluar),
            "per_kategori": {k: float(v) for k, v in per_kategori.items()},
            "per_sumber": {k: float(v) for k, v in per_sumber.items()},
            "diperbarui_pada": terakhir.isoformat() if terakhir else None,
        }


class RepoVerifikasiMemori:
    def __init__(self):
        self._rows: dict[UUID, M.Verifikasi] = {}

    async def simpan(self, v: M.Verifikasi) -> M.Verifikasi:
        self._rows[v.id] = v
        return v

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.Verifikasi]:
        row = self._rows.get(id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.Verifikasi:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Verifikasi tidak ditemukan.")
        return row

    async def untuk_entitas(
        self, desa_id: UUID, entitas_tipe: str, entitas_id: UUID,
    ) -> Optional[M.Verifikasi]:
        for v in self._rows.values():
            if v.desa_id == desa_id and v.entitas_tipe == entitas_tipe and v.entitas_id == entitas_id:
                return v
        return None


class RepoDayaDukungMemori:
    def __init__(self):
        self._rows: dict[UUID, M.DayaDukung] = {}

    async def daftar(self, desa_id: UUID) -> list[M.DayaDukung]:
        return [r for r in self._rows.values() if r.desa_id == desa_id]

    async def ambil_destinasi(self, desa_id: UUID, destinasi_id: UUID) -> M.DayaDukung | None:
        for r in self._rows.values():
            if r.desa_id == desa_id and r.destinasi_id == destinasi_id:
                return r
        return None

    async def upsert(self, dd: M.DayaDukung) -> M.DayaDukung:
        for r in list(self._rows.values()):
            if r.destinasi_id == dd.destinasi_id:
                r.kapasitas_harian = dd.kapasitas_harian
                r.ambang_kuning = dd.ambang_kuning
                r.ambang_merah = dd.ambang_merah
                r.metode_hitung = dd.metode_hitung
                r.diperbarui_pada = dd.diperbarui_pada
                return r
        self._rows[dd.id] = dd
        return dd


class RepoPemakaianKapasitasMemori:
    def __init__(self):
        self._rows: dict[tuple[UUID, date], M.PemakaianKapasitas] = {}

    async def ambil(self, desa_id: UUID, destinasi_id: UUID, tanggal: date) -> M.PemakaianKapasitas | None:
        return self._rows.get((destinasi_id, tanggal))

    async def daftar(
        self, desa_id: UUID, *, destinasi_id: UUID | None = None,
        dari: date | None = None, sampai: date | None = None,
    ) -> list[M.PemakaianKapasitas]:
        out = []
        for r in self._rows.values():
            if r.desa_id != desa_id:
                continue
            if destinasi_id and r.destinasi_id != destinasi_id:
                continue
            if dari and r.tanggal < dari:
                continue
            if sampai and r.tanggal > sampai:
                continue
            out.append(r)
        return sorted(out, key=lambda x: x.tanggal, reverse=True)

    async def upsert(self, pk: M.PemakaianKapasitas) -> M.PemakaianKapasitas:
        self._rows[(pk.destinasi_id, pk.tanggal)] = pk
        return pk


class RepoKunjunganMemori:
    def __init__(self):
        self._booking: list[M.Booking] = []
        self._stempel: list[M.Stempel] = []
        self._stasiun: dict[UUID, M.StasiunLestari] = {}

    def set_stasiun(self, st: M.StasiunLestari) -> None:
        self._stasiun[st.id] = st

    async def tambah_booking(self, bk: M.Booking) -> None:
        self._booking.append(bk)

    async def tambah_stempel(self, st: M.Stempel) -> None:
        self._stempel.append(st)

    async def hitung(self, desa_id: UUID, destinasi_id: UUID, tanggal: date) -> int:
        n = 0
        for b in self._booking:
            if (
                b.desa_id == desa_id
                and b.destinasi_id == destinasi_id
                and b.tanggal_kunjungan == tanggal
                and b.status in ("dipesan", "checkin", "selesai")
            ):
                n += b.jumlah_orang
        for s in self._stempel:
            if s.desa_id != desa_id or s.status != "terverifikasi":
                continue
            if s.stasiun_id and self._stasiun.get(s.stasiun_id):
                st = self._stasiun[s.stasiun_id]
                if st.destinasi_id == destinasi_id and s.dibuat_pada and s.dibuat_pada.date() == tanggal:
                    n += 1
        return n


class RepoTransaksiNeracaMemori:
    def __init__(self):
        self._rows: list[M.Transaksi] = []

    async def simpan(self, t: M.Transaksi) -> M.Transaksi:
        self._rows.append(t)
        return t

    async def daftar_periode(self, desa_id: UUID, periode: str) -> list[M.Transaksi]:
        return [
            t for t in self._rows
            if t.desa_id == desa_id and t.dibuat_pada.strftime("%Y-%m") == periode
        ]


class RepoStempelNeracaMemori:
    def __init__(self):
        self._rows: list[M.Stempel] = []

    async def simpan(self, s: M.Stempel) -> M.Stempel:
        self._rows.append(s)
        return s

    async def daftar_terverifikasi_periode(self, desa_id: UUID, periode: str) -> list[M.Stempel]:
        return [
            s for s in self._rows
            if s.desa_id == desa_id
            and s.status == "terverifikasi"
            and s.dibuat_pada
            and s.dibuat_pada.strftime("%Y-%m") == periode
        ]


class RepoNeracaRegeneratifMemori:
    def __init__(self):
        self._rows: dict[tuple[UUID, str], M.NeracaRegeneratif] = {}

    async def ambil_periode(self, desa_id: UUID, periode: str) -> M.NeracaRegeneratif | None:
        return self._rows.get((desa_id, periode))

    async def daftar(
        self, desa_id: UUID, *, dari: str | None = None, sampai: str | None = None,
    ) -> list[M.NeracaRegeneratif]:
        out = []
        for (d, p), n in self._rows.items():
            if d != desa_id:
                continue
            if dari and p < dari:
                continue
            if sampai and p > sampai:
                continue
            out.append(n)
        return sorted(out, key=lambda x: x.periode, reverse=True)

    async def simpan(self, n: M.NeracaRegeneratif) -> M.NeracaRegeneratif:
        ada = self._rows.get((n.desa_id, n.periode))
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
            return ada
        self._rows[(n.desa_id, n.periode)] = n
        return n

    async def kunci(self, desa_id: UUID, periode: str) -> M.NeracaRegeneratif:
        row = self._rows.get((desa_id, periode))
        if row is None:
            raise TidakDitemukan("Neraca tidak ditemukan.")
        row.terkunci = True
        return row


class RepoAgregatMemori:
    def __init__(self):
        self._rows: dict[tuple, M.AgregatHarian] = {}

    def _kunci(self, desa_id: UUID, tanggal: date, kode_metrik: str, dimensi: dict) -> tuple:
        from app.f3.util import kunci_dimensi
        return (desa_id, tanggal, kode_metrik, kunci_dimensi(dimensi))

    async def upsert_tambah(
        self, desa_id: UUID, tanggal: date, kode_metrik: str, dimensi: dict, tambah: float,
    ) -> M.AgregatHarian:
        from app.f3.util import uuid7
        from datetime import datetime, timezone
        k = self._kunci(desa_id, tanggal, kode_metrik, dimensi)
        row = self._rows.get(k)
        if row:
            row.nilai = Decimal(str(float(row.nilai) + tambah))
            row.diperbarui_pada = datetime.now(timezone.utc)
            return row
        row = M.AgregatHarian(
            id=uuid7(),
            desa_id=desa_id,
            tanggal=tanggal,
            kode_metrik=kode_metrik,
            dimensi=dict(dimensi or {}),
            nilai=Decimal(str(tambah)),
        )
        self._rows[k] = row
        return row

    async def set_nilai(
        self, desa_id: UUID, tanggal: date, kode_metrik: str, dimensi: dict, nilai: float,
    ) -> M.AgregatHarian:
        from app.f3.util import uuid7
        from datetime import datetime, timezone
        k = self._kunci(desa_id, tanggal, kode_metrik, dimensi)
        row = self._rows.get(k)
        if row:
            row.nilai = Decimal(str(nilai))
            row.diperbarui_pada = datetime.now(timezone.utc)
            return row
        row = M.AgregatHarian(
            id=uuid7(),
            desa_id=desa_id,
            tanggal=tanggal,
            kode_metrik=kode_metrik,
            dimensi=dict(dimensi or {}),
            nilai=Decimal(str(nilai)),
        )
        self._rows[k] = row
        return row

    async def daftar(
        self,
        desa_id: UUID,
        *,
        kode_metrik: str | None = None,
        dari: date | None = None,
        sampai: date | None = None,
        dimensi: dict | None = None,
    ) -> list[M.AgregatHarian]:
        from app.f3.util import kunci_dimensi
        kd = kunci_dimensi(dimensi) if dimensi is not None else None
        out = []
        for row in self._rows.values():
            if row.desa_id != desa_id:
                continue
            if kode_metrik and row.kode_metrik != kode_metrik:
                continue
            if dari and row.tanggal < dari:
                continue
            if sampai and row.tanggal > sampai:
                continue
            if kd is not None and kunci_dimensi(row.dimensi or {}) != kd:
                continue
            out.append(row)
        return sorted(out, key=lambda r: (r.tanggal, r.kode_metrik))


class RepoJobAnalitikMemori:
    def __init__(self):
        self._rows: dict[UUID, M.JobAnalitik] = {}

    async def simpan(self, j: M.JobAnalitik) -> M.JobAnalitik:
        self._rows[j.id] = j
        return j

    async def ambil(self, job_id: UUID) -> M.JobAnalitik | None:
        return self._rows.get(job_id)

    async def semua(self) -> list[M.JobAnalitik]:
        return list(self._rows.values())

    async def daftar(
        self,
        *,
        lapisan: str | None = None,
        status: str | None = None,
        desa_id: UUID | None = None,
    ) -> list[M.JobAnalitik]:
        out = []
        for j in self._rows.values():
            if lapisan and j.lapisan != lapisan:
                continue
            if status and j.status != status:
                continue
            if desa_id is not None and j.desa_id != desa_id:
                continue
            out.append(j)
        return sorted(out, key=lambda x: x.mulai_pada, reverse=True)


class RepoLaporanMemori:
    def __init__(self):
        self._rows: dict[UUID, M.LaporanBulanan] = {}

    async def simpan(self, lap: M.LaporanBulanan) -> M.LaporanBulanan:
        self._rows[lap.id] = lap
        return lap

    async def ambil(self, desa_id: UUID, laporan_id: UUID) -> M.LaporanBulanan | None:
        row = self._rows.get(laporan_id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def ambil_periode(self, desa_id: UUID, periode: str) -> M.LaporanBulanan | None:
        for row in self._rows.values():
            if row.desa_id == desa_id and row.periode == periode:
                return row
        return None

    async def daftar(
        self, desa_id: UUID, *, periode: str | None = None, status: str | None = None,
    ) -> list[M.LaporanBulanan]:
        out = []
        for row in self._rows.values():
            if row.desa_id != desa_id:
                continue
            if periode and row.periode != periode:
                continue
            if status and row.status != status:
                continue
            out.append(row)
        return sorted(out, key=lambda r: r.periode, reverse=True)

