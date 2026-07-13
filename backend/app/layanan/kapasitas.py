"""Jejak Lestari — daya dukung & pemakaian kapasitas."""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from app.domain import konteks as ctx
from app.domain import rbac
from app.domain.errors import (
    DayaDukungTerlampaui,
    JobSedangBerjalan,
    KesalahanValidasi,
    TidakDitemukan,
)
from app.domain.konteks import boleh
from app.f3.enums import LevelKapasitas
from app.f3.util import uuid7
from app.model import tabel as M


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _level(rasio: float, kuning: float, merah: float) -> str:
    if rasio >= merah:
        return LevelKapasitas.merah.value
    if rasio >= kuning:
        return LevelKapasitas.kuning.value
    return LevelKapasitas.hijau.value


def blokir_booking_merah(pengaturan: M.PengaturanDesa) -> bool:
    return bool((pengaturan.kebijakan_pembatalan or {}).get("blokir_booking_merah", False))


class KapasitasLayanan:
    def __init__(self, store):
        self.store = store
        self.daya_dukung = store.daya_dukung
        self.pemakaian = store.pemakaian_kapasitas
        self.kunjungan = store.kunjungan

    async def daftar_daya_dukung(self, konteks: ctx.Konteks, desa_id: UUID) -> list[M.DayaDukung]:
        ctx.wajib(konteks, rbac.KELOLA_DAYA_DUKUNG, desa_id)
        return await self.daya_dukung.daftar(desa_id)

    async def upsert_daya_dukung(
        self, konteks: ctx.Konteks, desa_id: UUID, destinasi_id: UUID, data: dict,
    ) -> M.DayaDukung:
        ctx.wajib(konteks, rbac.KELOLA_DAYA_DUKUNG, desa_id)
        kap = int(data["kapasitas_harian"])
        kuning = float(data["ambang_kuning"])
        merah = float(data["ambang_merah"])
        if not (0 < kuning < merah <= 1.0):
            raise KesalahanValidasi("ambang: 0 < kuning < merah <= 1")
        if kap < 1:
            raise KesalahanValidasi("kapasitas_harian minimal 1")
        dest = await self.store.destinasi.ambil(destinasi_id)
        if dest is None or dest.desa_id != desa_id:
            raise TidakDitemukan("Destinasi tidak ditemukan.")
        ada = await self.daya_dukung.ambil_destinasi(desa_id, destinasi_id)
        dd = M.DayaDukung(
            id=ada.id if ada else uuid7(),
            desa_id=desa_id,
            destinasi_id=destinasi_id,
            kapasitas_harian=kap,
            ambang_kuning=Decimal(str(kuning)),
            ambang_merah=Decimal(str(merah)),
            metode_hitung=data.get("metode_hitung", "booking+checkin"),
            diperbarui_pada=_now(),
        )
        return await self.daya_dukung.upsert(dd)

    async def hitung_snapshot(
        self, desa_id: UUID, destinasi_id: UUID, tanggal: date, kunjungan: int | None = None,
    ) -> M.PemakaianKapasitas:
        dd = await self.daya_dukung.ambil_destinasi(desa_id, destinasi_id)
        if dd is None:
            raise KesalahanValidasi("daya_dukung belum dikonfigurasi")
        if kunjungan is None:
            kunjungan = await self.kunjungan.hitung(desa_id, destinasi_id, tanggal)
        rasio = kunjungan / dd.kapasitas_harian if dd.kapasitas_harian else 0.0
        level = _level(rasio, float(dd.ambang_kuning), float(dd.ambang_merah))
        ada = await self.pemakaian.ambil(desa_id, destinasi_id, tanggal)
        pk = M.PemakaianKapasitas(
            id=ada.id if ada else uuid7(),
            desa_id=desa_id,
            destinasi_id=destinasi_id,
            tanggal=tanggal,
            kunjungan=kunjungan,
            kapasitas_harian=dd.kapasitas_harian,
            rasio=Decimal(str(round(rasio, 6))),
            level=level,
            dihitung_pada=_now(),
        )
        return await self.pemakaian.upsert(pk)

    async def daftar_kapasitas(
        self,
        konteks: ctx.Konteks | None,
        desa_id: UUID,
        *,
        destinasi_id: UUID | None = None,
        dari: date | None = None,
        sampai: date | None = None,
        publik: bool = False,
    ) -> list[M.PemakaianKapasitas]:
        if not publik:
            ctx.wajib(konteks, rbac.BACA_KAPASITAS_PENGELOLA, desa_id)
        return await self.pemakaian.daftar(
            desa_id, destinasi_id=destinasi_id, dari=dari, sampai=sampai,
        )

    async def hari_ini(
        self,
        konteks: ctx.Konteks | None,
        desa_id: UUID,
        tanggal: date | None = None,
        publik: bool = False,
    ) -> list[M.PemakaianKapasitas]:
        tgl = tanggal or date.today()
        configs = await self.daya_dukung.daftar(desa_id)
        hasil: list[M.PemakaianKapasitas] = []
        for dd in configs:
            snap = await self.pemakaian.ambil(desa_id, dd.destinasi_id, tgl)
            if snap:
                hasil.append(snap)
        if not publik:
            ctx.wajib(konteks, rbac.BACA_KAPASITAS_PENGELOLA, desa_id)
        return hasil

    async def trigger_hitung(
        self, konteks: ctx.Konteks, desa_id: UUID, tanggal: date | None = None,
    ) -> list[M.PemakaianKapasitas]:
        ctx.wajib(konteks, rbac.HITUNG_KAPASITAS, desa_id)
        tgl = tanggal or date.today()
        key = f"{desa_id}:{tgl.isoformat()}"
        locks: set[str] = self.store._job_kapasitas
        if key in locks:
            raise JobSedangBerjalan("Hitung kapasitas sedang berjalan.")
        locks.add(key)
        try:
            configs = await self.daya_dukung.daftar(desa_id)
            return [
                await self.hitung_snapshot(desa_id, dd.destinasi_id, tgl)
                for dd in configs
            ]
        finally:
            locks.discard(key)

    async def cek_blokir_booking(
        self, desa_id: UUID, destinasi_id: UUID, tanggal: date, blokir_aktif: bool,
    ) -> dict | None:
        """Hook checkout F2. Return peringatan {level, rasio} atau raise jika blokir."""
        snap = await self.pemakaian.ambil(desa_id, destinasi_id, tanggal)
        if snap is None:
            return None
        info = {"destinasi_id": str(destinasi_id), "tanggal": tanggal.isoformat(),
                "level": snap.level, "rasio": float(snap.rasio)}
        if snap.level == LevelKapasitas.merah.value and blokir_aktif:
            raise DayaDukungTerlampaui(f"Spot penuh pada {tanggal}")
        if snap.level in (LevelKapasitas.kuning.value, LevelKapasitas.merah.value):
            return info
        return None

    async def peringatan_checkout(
        self, desa_id: UUID, resolved_items: list[dict], pengaturan: M.PengaturanDesa,
    ) -> list[dict]:
        blokir = blokir_booking_merah(pengaturan)
        peringatan: list[dict] = []
        for r in resolved_items:
            if not r.get("slot_jadwal_id"):
                continue
            destinasi_id = r.get("destinasi_id")
            tanggal = r.get("tanggal_kunjungan")
            if not destinasi_id or not tanggal:
                continue
            info = await self.cek_blokir_booking(desa_id, destinasi_id, tanggal, blokir)
            if info:
                peringatan.append(info)
        return peringatan
