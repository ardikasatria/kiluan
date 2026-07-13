"""Anjungan Data — laporan bulanan draf → final + PDF."""
from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timezone
from uuid import UUID

from app.domain import konteks as ctx
from app.domain import rbac
from app.domain.errors import PeriodeFinal, TidakDitemukan, TransisiIlegal
from app.domain.entitas import Media
from app.domain.enums import TipeMedia
from app.f3.enums import StatusLaporan
from app.f3.util import uuid7
from app.layanan.agregat import AgregatLayanan
from app.model import tabel as M


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _pdf_minimal(judul: str, isi: str) -> bytes:
    """PDF minimal tanpa dependensi eksternal — cukup untuk snapshot PkM."""
    teks = f"{judul}\\n\\n{isi}".replace("(", "\\(").replace(")", "\\)")
    stream = f"BT /F1 12 Tf 50 750 Td ({teks[:500]}) Tj ET"
    body = (
        f"%PDF-1.4\n"
        f"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        f"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        f"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        f"4 0 obj<</Length {len(stream)}>>stream\n{stream}\nendstream endobj\n"
        f"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        f"xref\n0 6\n0000000000 65535 f \n"
        f"trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF"
    )
    return body.encode("latin-1", errors="replace")


class LaporanLayanan:
    def __init__(self, store):
        self.store = store
        self.laporan = store.laporan_bulanan
        self.agregat_svc = AgregatLayanan(store)

    async def generate(self, konteks: ctx.Konteks, desa_id: UUID, periode: str) -> M.LaporanBulanan:
        ctx.wajib(konteks, rbac.KELOLA_LAPORAN, desa_id)
        ada = await self.laporan.ambil_periode(desa_id, periode)
        if ada and ada.status == StatusLaporan.final.value:
            raise PeriodeFinal(f"Laporan {periode} sudah final.")
        ringkasan = await self.agregat_svc.ringkas(konteks, desa_id, periode)
        if ada:
            ada.ringkasan = ringkasan
            ada.status = StatusLaporan.draf.value
            return await self.laporan.simpan(ada)
        lap = M.LaporanBulanan(
            id=uuid7(),
            desa_id=desa_id,
            periode=periode,
            ringkasan=ringkasan,
            status=StatusLaporan.draf.value,
            dibuat_pada=_now(),
        )
        return await self.laporan.simpan(lap)

    async def daftar(
        self, konteks: ctx.Konteks, desa_id: UUID, *, periode: str | None = None, status: str | None = None,
    ) -> list[M.LaporanBulanan]:
        ctx.wajib(konteks, rbac.KELOLA_LAPORAN, desa_id)
        return await self.laporan.daftar(desa_id, periode=periode, status=status)

    async def detail(
        self, konteks: ctx.Konteks, desa_id: UUID, periode: str,
    ) -> M.LaporanBulanan:
        ctx.wajib(konteks, rbac.KELOLA_LAPORAN, desa_id)
        row = await self.laporan.ambil_periode(desa_id, periode)
        if row is None:
            raise TidakDitemukan("Laporan tidak ditemukan.")
        return row

    async def _simpan_pdf(self, desa_id: UUID, konteks: ctx.Konteks, periode: str, ringkasan: dict) -> UUID:
        objek = f"{desa_id}/laporan/{uuid7().hex}.pdf"
        pdf = _pdf_minimal(f"Laporan {periode}", str(ringkasan)[:2000])
        await self.store.objek.taruh(objek)
        m = Media(
            desa_id=desa_id,
            objek_minio=objek,
            tipe=TipeMedia.foto,
            mime="application/pdf",
            ukuran=len(pdf),
            diunggah_oleh=konteks.pengguna_id,
            dikonfirmasi=True,
        )
        if hasattr(self.store.media, "tambah"):
            await self.store.media.tambah(m)
        else:
            await self.store.media.simpan(m)
        return m.id

    async def finalkan(
        self, konteks: ctx.Konteks, desa_id: UUID, laporan_id: UUID,
    ) -> M.LaporanBulanan:
        ctx.wajib(konteks, rbac.KELOLA_LAPORAN, desa_id)
        lap = await self.laporan.ambil(desa_id, laporan_id)
        if lap is None:
            raise TidakDitemukan("Laporan tidak ditemukan.")
        if lap.status == StatusLaporan.final.value:
            raise PeriodeFinal(f"Laporan {lap.periode} sudah final.")
        if lap.status != StatusLaporan.draf.value:
            raise TransisiIlegal("Hanya draf yang dapat difinalkan.")
        lap.file_media_id = await self._simpan_pdf(desa_id, konteks, lap.periode, lap.ringkasan or {})
        lap.status = StatusLaporan.final.value
        return await self.laporan.simpan(lap)
