"""Jejak Lestari — monitoring ekologi.

catat / sync(offline, idempoten atas id) / verifikasi (geofence sinkron & manual).
Hanya monitoring terverifikasi yang menulis peristiwa(monitoring_terverifikasi).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import List, Optional
from uuid import UUID

from . import errors as E
from .enums import (ENTITAS_MONITORING, HasilVerifikasi, JenisPeristiwa,
                    MetodeMonitoring, StatusMonitoring)
from .model import MonitoringEkologi, Peristiwa, Verifikasi
from .util import Jam, jarak_meter, uuid7


@dataclass
class HasilSync:
    id: UUID
    status: str  # tersimpan | duplikat | ditolak
    verifikasi_id: Optional[UUID] = None
    galat: Optional[str] = None


class LayananMonitoring:
    def __init__(self, repo_monitoring, repo_indikator, repo_verifikasi, repo_peristiwa, jam: Jam):
        self.monitoring = repo_monitoring
        self.indikator = repo_indikator
        self.verifikasi = repo_verifikasi
        self.peristiwa = repo_peristiwa
        self.jam = jam

    async def catat(self, desa_id: UUID, pencatat_id: UUID, data: dict) -> MonitoringEkologi:
        indi = await self.indikator.ambil(desa_id, data["indikator_id"])
        if indi is None or not indi.aktif:
            raise E.indikator_tidak_aktif()
        metode = MetodeMonitoring(data["metode"])
        if metode == MetodeMonitoring.pihak_ketiga and not data.get("media_id"):
            raise E.bukti_media_wajib("monitoring pihak_ketiga wajib bukti")

        mid = data.get("id") or uuid7()
        m = MonitoringEkologi(
            id=mid, desa_id=desa_id, indikator_id=data["indikator_id"],
            destinasi_id=data.get("destinasi_id"), nilai=float(data["nilai"]),
            waktu_ukur=data["waktu_ukur"], pencatat_id=pencatat_id, metode=metode,
            status=StatusMonitoring.menunggu_verifikasi, media_id=data.get("media_id"),
            catatan=data.get("catatan", ""), lokasi=data.get("lokasi"),
            dibuat_pada=self.jam.now(),
        )
        await self.monitoring.simpan(m)
        v = Verifikasi(id=uuid7(), desa_id=desa_id, entitas_tipe=ENTITAS_MONITORING,
                       entitas_id=mid, metode=metode.value, hasil=HasilVerifikasi.menunggu,
                       dibuat_pada=self.jam.now())
        await self.verifikasi.simpan(v)
        return m

    async def sync(self, desa_id: UUID, pencatat_id: UUID, pembacaan: List[dict]) -> List[HasilSync]:
        """Batch offline: upsert idempoten atas id klien; sukses parsial per-record."""
        hasil: List[HasilSync] = []
        for rec in pembacaan:
            rid = rec.get("id")
            if rid is not None:
                ada = await self.monitoring.ambil(desa_id, rid)
                if ada is not None:
                    v = await self._verifikasi_untuk(desa_id, rid)
                    hasil.append(HasilSync(id=rid, status="duplikat",
                                           verifikasi_id=v.id if v else None))
                    continue
            try:
                m = await self.catat(desa_id, pencatat_id, rec)
                v = await self._verifikasi_untuk(desa_id, m.id)
                hasil.append(HasilSync(id=m.id, status="tersimpan",
                                       verifikasi_id=v.id if v else None))
            except E.GalatDomain as g:
                hasil.append(HasilSync(id=rid, status="ditolak", galat=g.kode))
        return hasil

    async def _verifikasi_untuk(self, desa_id: UUID, monitoring_id: UUID) -> Optional[Verifikasi]:
        vs = await self.verifikasi.daftar(
            desa_id, lambda v: v.entitas_tipe == ENTITAS_MONITORING and v.entitas_id == monitoring_id)
        return vs[0] if vs else None

    # --- verifikasi sinkron (geofence) ---
    async def verifikasi_geofence(self, desa_id: UUID, monitoring_id: UUID, *,
                                  pusat: tuple, radius_m: float, wajib_bukti: bool = False) -> MonitoringEkologi:
        m = await self.monitoring.ambil(desa_id, monitoring_id)
        if m is None:
            raise E.tidak_ditemukan()
        if m.lokasi is None:
            raise E.di_luar_geofence("lokasi tidak dicatat")
        if wajib_bukti and not m.media_id:
            raise E.bukti_kurang("bukti tidak memenuhi syarat")
        d = jarak_meter(m.lokasi[0], m.lokasi[1], pusat[0], pusat[1])
        if d > radius_m:
            raise E.di_luar_geofence(f"jarak {d:.0f}m > {radius_m:.0f}m")
        return await self._lolos(desa_id, m)

    # --- verifikasi manual ---
    async def putuskan(self, desa_id: UUID, verifikasi_id: UUID, valid: bool,
                       verifikator_id: UUID) -> MonitoringEkologi:
        v = await self.verifikasi.ambil(desa_id, verifikasi_id)
        if v is None or v.entitas_tipe != ENTITAS_MONITORING:
            raise E.tidak_ditemukan()
        if v.hasil != HasilVerifikasi.menunggu:
            raise E.transisi_ilegal("verifikasi sudah diputus")
        m = await self.monitoring.ambil(desa_id, v.entitas_id)
        v.verifikator_id = verifikator_id
        v.diputuskan_pada = self.jam.now()
        if valid:
            v.hasil = HasilVerifikasi.valid
            return await self._lolos(desa_id, m)
        v.hasil = HasilVerifikasi.invalid
        m.status = StatusMonitoring.ditolak
        await self.monitoring.simpan(m)
        return m

    async def _lolos(self, desa_id: UUID, m: MonitoringEkologi) -> MonitoringEkologi:
        m.status = StatusMonitoring.terverifikasi
        await self.monitoring.simpan(m)
        indi = await self.indikator.ambil(desa_id, m.indikator_id)
        await self.peristiwa.simpan(Peristiwa(
            id=uuid7(), desa_id=desa_id, jenis=JenisPeristiwa.monitoring_terverifikasi.value,
            muatan={"monitoring_id": str(m.id), "indikator_kode": indi.kode if indi else None,
                    "nilai": m.nilai, "waktu_ukur": m.waktu_ukur.isoformat()},
            terjadi_pada=self.jam.now()))
        return m
