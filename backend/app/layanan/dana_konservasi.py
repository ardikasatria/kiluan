"""Jejak Lestari — dana konservasi (ledger transparan append-only)."""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from app.domain import konteks as ctx
from app.domain import rbac
from app.domain.errors import BuktiMediaWajib, IdempotencyKeyWajib, KesalahanValidasi, TidakBerwenang
from app.f3.enums import JenisDana, SumberDana
from app.inti.idempotensi import toko_idempotensi
from app.model import tabel as M


def _now() -> datetime:
    return datetime.now(timezone.utc)


class DanaKonservasiLayanan:
    def __init__(self, store):
        self.store = store
        self.dana = store.dana_konservasi

    async def catat(
        self,
        konteks: ctx.Konteks,
        desa_id: UUID,
        data: dict,
        *,
        idempotency_key: str | None = None,
    ) -> M.DanaKonservasi:
        ctx.wajib(konteks, rbac.CATAT_DANA_KONSERVASI, desa_id)
        if konteks.pengguna_id is None:
            raise TidakBerwenang()
        toko_idempotensi.wajib_key(idempotency_key)
        ep = "dana-konservasi"
        cache = toko_idempotensi.ambil(idempotency_key, str(konteks.pengguna_id), ep)
        if cache is not None:
            return cache

        jenis = JenisDana(data["jenis"])
        sumber = data.get("sumber_tipe")
        if sumber is not None:
            sumber_enum = SumberDana(sumber)
            if sumber_enum == SumberDana.transaksi:
                raise KesalahanValidasi("Inflow transaksi otomatis, bukan manual.")
            sumber = sumber_enum.value
        if jenis == JenisDana.keluar and not data.get("bukti_media_id"):
            raise BuktiMediaWajib("Pengeluaran wajib bukti media.")

        tanggal = data["tanggal"]
        if isinstance(tanggal, str):
            tanggal = date.fromisoformat(tanggal)

        entri = M.DanaKonservasi(
            id=uuid4(),
            desa_id=desa_id,
            jenis=jenis.value,
            jumlah=Decimal(str(data["jumlah"])),
            tanggal=tanggal,
            dicatat_oleh=konteks.pengguna_id,
            sumber_tipe=sumber if jenis == JenisDana.masuk else None,
            kategori=data.get("kategori") if jenis == JenisDana.keluar else None,
            keterangan=data.get("keterangan", ""),
            bukti_media_id=UUID(data["bukti_media_id"]) if data.get("bukti_media_id") else None,
            dibuat_pada=_now(),
        )
        baris = await self.dana.simpan(entri)
        return toko_idempotensi.simpan(idempotency_key, str(konteks.pengguna_id), ep, baris)

    async def inflow_dari_transaksi(self, trx: M.Transaksi) -> M.DanaKonservasi:
        """Dipicu saat transaksi dirilis — idempoten per sumber_id."""
        if trx.porsi_reinvestasi <= 0:
            ada = await self.dana.ambil_sumber(trx.desa_id, SumberDana.transaksi.value, trx.id)
            if ada:
                return ada
            raise KesalahanValidasi("Porsi reinvestasi nol.")
        tanggal = trx.dibuat_pada.date() if trx.dibuat_pada else date.today()
        entri = M.DanaKonservasi(
            id=uuid4(),
            desa_id=trx.desa_id,
            jenis=JenisDana.masuk.value,
            jumlah=trx.porsi_reinvestasi,
            tanggal=tanggal,
            dicatat_oleh=trx.penyedia_id,
            sumber_tipe=SumberDana.transaksi.value,
            sumber_id=trx.id,
            keterangan=f"reinvestasi transaksi {trx.id}",
            dibuat_pada=_now(),
        )
        baris, _ = await self.dana.inflow_idempoten(entri)
        return baris

    async def saldo(self, desa_id: UUID) -> dict:
        return await self.dana.saldo(desa_id)

    async def daftar(
        self,
        konteks: ctx.Konteks | None,
        desa_id: UUID,
        *,
        jenis: str | None = None,
        kategori: str | None = None,
        dari: date | None = None,
        sampai: date | None = None,
        publik: bool = False,
    ) -> list[M.DanaKonservasi]:
        if not publik:
            if konteks is None:
                raise TidakBerwenang()
            ctx.wajib(konteks, rbac.BACA_DANA_PENGELOLA, desa_id)
        return await self.dana.daftar(desa_id, jenis=jenis, kategori=kategori, dari=dari, sampai=sampai)

    async def detail(
        self, konteks: ctx.Konteks | None, desa_id: UUID, entri_id: UUID, *, publik: bool = False,
    ) -> M.DanaKonservasi:
        if not publik:
            if konteks is None:
                raise TidakBerwenang()
            ctx.wajib(konteks, rbac.BACA_DANA_PENGELOLA, desa_id)
        return await self.dana.wajib(desa_id, entri_id)
