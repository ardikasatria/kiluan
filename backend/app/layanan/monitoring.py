"""Jejak Lestari — monitoring ekologi (catat, sync offline, verifikasi)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text

from app.domain import konteks as ctx
from app.domain import rbac
from app.domain.konteks import boleh
from app.domain.errors import (
    BuktiKurang,
    BuktiMediaWajib,
    DiLuarGeofence,
    IndikatorTidakAktif,
    KesalahanValidasi,
    TidakBerwenang,
    TidakDitemukan,
    TransisiIlegalF2,
)
from app.domain.geo import jarak_m
from app.f3.enums import ENTITAS_MONITORING, JenisPeristiwaAnalitik, MetodeMonitoring
from app.f3.util import uuid7
from app.inti.outbox import Outbox
from app.model import tabel as M
from app.repo.f2_sql import RepoVerifikasiSQL
from app.repo.f3_sql import dalam_geofence_destinasi


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class HasilSync:
    id: UUID
    status: str
    verifikasi_id: UUID | None = None
    galat: str | None = None


class MonitoringLayanan:
    def __init__(self, store):
        self.store = store
        self.indikator = store.indikator
        self.monitoring = store.monitoring
        if getattr(store, "sesi", None) is not None:
            self.verifikasi = RepoVerifikasiSQL(store.sesi)
        else:
            self.verifikasi = store.verifikasi
        self.outbox = Outbox(store)

    async def daftar_indikator(self, konteks: ctx.Konteks, desa_id: UUID) -> list[M.IndikatorEkologi]:
        ctx.wajib(konteks, rbac.BACA_MONITORING_PENGELOLA, desa_id)
        return await self.indikator.daftar(desa_id)

    async def buat_indikator(self, konteks: ctx.Konteks, desa_id: UUID, data: dict) -> M.IndikatorEkologi:
        ctx.wajib(konteks, rbac.KELOLA_INDIKATOR, desa_id)
        ind = M.IndikatorEkologi(
            id=0,
            desa_id=desa_id,
            kode=data["kode"],
            nama=data["nama"],
            satuan=data["satuan"],
            arah_baik=data.get("arah_baik", "naik"),
            deskripsi=data.get("deskripsi", ""),
            aktif=data.get("aktif", True),
        )
        return await self.indikator.simpan(ind)

    async def ubah_indikator(
        self, konteks: ctx.Konteks, desa_id: UUID, indikator_id: int, data: dict,
    ) -> M.IndikatorEkologi:
        ctx.wajib(konteks, rbac.KELOLA_INDIKATOR, desa_id)
        ind = await self.indikator.ambil(desa_id, indikator_id)
        if ind is None or ind.desa_id != desa_id:
            raise TidakDitemukan("Indikator tidak ditemukan.")
        for f in ("nama", "satuan", "arah_baik", "deskripsi", "aktif"):
            if f in data and data[f] is not None:
                setattr(ind, f, data[f])
        return await self.indikator.simpan(ind)

    async def catat(self, konteks: ctx.Konteks, desa_id: UUID, data: dict) -> dict[str, Any]:
        ctx.wajib(konteks, rbac.CATAT_MONITORING, desa_id)
        if konteks.pengguna_id is None:
            raise TidakBerwenang()
        m, v = await self._catat_internal(desa_id, konteks.pengguna_id, data)
        return {"monitoring": m, "verifikasi": v}

    async def _catat_internal(
        self, desa_id: UUID, pencatat_id: UUID, data: dict,
    ) -> tuple[M.MonitoringEkologi, M.Verifikasi]:
        indi = await self.indikator.ambil(desa_id, int(data["indikator_id"]))
        if indi is None or not indi.aktif:
            raise IndikatorTidakAktif("Indikator tidak aktif atau tidak dikenal.")
        metode = MetodeMonitoring(data["metode"])
        if metode == MetodeMonitoring.pihak_ketiga and not data.get("media_id"):
            raise BuktiMediaWajib("Monitoring pihak_ketiga wajib bukti media.")

        mid = UUID(data["id"]) if data.get("id") else uuid7()
        lok = data.get("lokasi") or {}
        lat, lng = lok.get("lat"), lok.get("lng")
        waktu = data["waktu_ukur"]
        if isinstance(waktu, str):
            waktu = date.fromisoformat(waktu)

        m = M.MonitoringEkologi(
            id=mid,
            desa_id=desa_id,
            indikator_id=int(data["indikator_id"]),
            destinasi_id=UUID(data["destinasi_id"]) if data.get("destinasi_id") else None,
            nilai=data["nilai"],
            waktu_ukur=waktu,
            pencatat_id=pencatat_id,
            metode=metode.value,
            status="menunggu_verifikasi",
            media_id=UUID(data["media_id"]) if data.get("media_id") else None,
            catatan=data.get("catatan", ""),
            dibuat_pada=_now(),
        )
        lat_f = float(lat) if lat is not None else None
        lng_f = float(lng) if lng is not None else None
        await self.monitoring.simpan(m, lat=lat_f, lng=lng_f)

        v = M.Verifikasi(
            id=uuid4(),
            desa_id=desa_id,
            entitas_tipe=ENTITAS_MONITORING,
            entitas_id=mid,
            metode=metode.value,
            hasil="menunggu",
            dibuat_pada=_now(),
        )
        await self.verifikasi.simpan(v)
        return m, v

    async def sync(self, konteks: ctx.Konteks, desa_id: UUID, pembacaan: list[dict]) -> list[HasilSync]:
        ctx.wajib(konteks, rbac.CATAT_MONITORING, desa_id)
        if konteks.pengguna_id is None:
            raise TidakBerwenang()
        hasil: list[HasilSync] = []
        for rec in pembacaan:
            rid = UUID(rec["id"]) if rec.get("id") else None
            if rid is not None:
                ada = await self.monitoring.ambil(desa_id, rid)
                if ada is not None:
                    v = await self._verifikasi_untuk(desa_id, rid)
                    hasil.append(HasilSync(id=rid, status="duplikat", verifikasi_id=v.id if v else None))
                    continue
            try:
                m, v = await self._catat_internal(desa_id, konteks.pengguna_id, rec)
                hasil.append(HasilSync(id=m.id, status="tersimpan", verifikasi_id=v.id))
            except Exception as exc:
                kode = getattr(exc, "kode", "validasi_gagal")
                hasil.append(HasilSync(id=rid or uuid4(), status="ditolak", galat=kode))
        return hasil

    async def _verifikasi_untuk(self, desa_id: UUID, monitoring_id: UUID) -> M.Verifikasi | None:
        if hasattr(self.verifikasi, "untuk_entitas"):
            return await self.verifikasi.untuk_entitas(desa_id, ENTITAS_MONITORING, monitoring_id)
        return await self.monitoring.verifikasi_untuk(desa_id, monitoring_id)

    async def daftar(
        self,
        konteks: ctx.Konteks,
        desa_id: UUID,
        *,
        indikator_id: int | None = None,
        destinasi_id: UUID | None = None,
        status: str | None = None,
        milik: str | None = None,
        dari: date | None = None,
        sampai: date | None = None,
    ) -> list[M.MonitoringEkologi]:
        pencatat_id = None
        if milik == "saya":
            if konteks.pengguna_id is None:
                raise TidakBerwenang()
            pencatat_id = konteks.pengguna_id
        else:
            ctx.wajib(konteks, rbac.BACA_MONITORING_PENGELOLA, desa_id)
        return await self.monitoring.daftar(
            desa_id,
            indikator_id=indikator_id,
            destinasi_id=destinasi_id,
            status=status,
            pencatat_id=pencatat_id,
            dari=dari,
            sampai=sampai,
        )

    async def detail(self, konteks: ctx.Konteks, desa_id: UUID, monitoring_id: UUID) -> M.MonitoringEkologi:
        m = await self.monitoring.ambil(desa_id, monitoring_id)
        if m is None:
            raise TidakDitemukan("Monitoring tidak ditemukan.")
        if not (
            konteks.admin_global()
            or boleh(konteks, rbac.BACA_MONITORING_PENGELOLA, desa_id)
            or (konteks.pengguna_id and m.pencatat_id == konteks.pengguna_id)
        ):
            raise TidakBerwenang()
        return m

    async def putuskan_verifikasi(
        self, konteks: ctx.Konteks, desa_id: UUID, verifikasi_id: UUID, hasil: str, catatan: str = "",
    ) -> M.MonitoringEkologi:
        from app.layanan.penjelajah import _verifikator

        if not _verifikator(konteks, desa_id):
            raise TidakBerwenang("Bukan verifikator berwenang.")
        v = await self.verifikasi.wajib(verifikasi_id, desa_id)
        if v.entitas_tipe != ENTITAS_MONITORING:
            raise TidakDitemukan("Verifikasi monitoring tidak ditemukan.")
        if v.hasil != "menunggu":
            raise TransisiIlegalF2("Verifikasi sudah diputus.")
        if hasil not in ("valid", "invalid"):
            raise KesalahanValidasi("hasil harus valid|invalid.")
        v.hasil = hasil
        v.verifikator_id = konteks.pengguna_id
        v.diputuskan_pada = _now()
        if catatan:
            bukti = dict(v.bukti or {})
            bukti["catatan_verifikator"] = catatan
            v.bukti = bukti
        m = await self.monitoring.wajib(desa_id, v.entitas_id)
        if hasil == "valid":
            return await self._lolos(desa_id, m, v)
        m.status = "ditolak"
        await self.monitoring.simpan(m)
        return m

    async def verifikasi_geofence(
        self,
        desa_id: UUID,
        monitoring_id: UUID,
        *,
        pusat: tuple[float, float] | None = None,
        destinasi_id: UUID | None = None,
        radius_m: float,
        wajib_bukti: bool = False,
    ) -> M.MonitoringEkologi:
        m = await self.monitoring.wajib(desa_id, monitoring_id)
        if wajib_bukti and not m.media_id:
            raise BuktiKurang("Bukti tidak memenuhi syarat.")
        res = await self.store.sesi.execute(
            text(
                "SELECT ST_Y(lokasi::geometry), ST_X(lokasi::geometry) "
                "FROM monitoring_ekologi WHERE id = :id AND lokasi IS NOT NULL"
            ),
            {"id": str(monitoring_id)},
        )
        row = res.first()
        if row is None:
            raise DiLuarGeofence("Lokasi tidak dicatat.")
        lat, lng = float(row[0]), float(row[1])
        if destinasi_id:
            ok = await dalam_geofence_destinasi(self.store.sesi, destinasi_id, lat, lng, radius_m)
            if not ok:
                raise DiLuarGeofence("Di luar radius destinasi.")
        elif pusat:
            if jarak_m(lat, lng, pusat[0], pusat[1]) > radius_m:
                raise DiLuarGeofence("Di luar radius.")
        else:
            raise KesalahanValidasi("Butuh destinasi_id atau pusat geofence.")
        v = await self._verifikasi_untuk(desa_id, monitoring_id)
        if v is None:
            raise TidakDitemukan("Verifikasi tidak ditemukan.")
        v.hasil = "valid"
        v.diputuskan_pada = _now()
        return await self._lolos(desa_id, m, v)

    async def _lolos(
        self, desa_id: UUID, m: M.MonitoringEkologi, v: M.Verifikasi,
    ) -> M.MonitoringEkologi:
        m.status = "terverifikasi"
        await self.monitoring.simpan(m)
        indi = await self.indikator.ambil(desa_id, m.indikator_id)
        await self.outbox.emit(
            desa_id,
            JenisPeristiwaAnalitik.monitoring_terverifikasi.value,
            ENTITAS_MONITORING,
            m.id,
            {
                "monitoring_id": str(m.id),
                "indikator_kode": indi.kode if indi else None,
                "nilai": float(m.nilai),
                "waktu_ukur": m.waktu_ukur.isoformat(),
            },
        )
        return m
