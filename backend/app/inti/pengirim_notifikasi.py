"""Dispatcher Genta — fan-out peristiwa → notifikasi per penerima (idempoten)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app.domain import entitas as E
from app.domain.enums import KodePeran, StatusKeanggotaan

# Event yang boleh kanal email bila Resend siap (F2: fallback in_app saja).
_EMAIL_JENIS = frozenset({
    "pembayaran_menunggu_konfirmasi",
    "pembayaran_berhasil",
    "payout_berhasil",
    "refund_selesai",
})

_JUDUL_DEFAULT: dict[str, str] = {
    "pembayaran_menunggu_konfirmasi": "Pembayaran menunggu konfirmasi",
    "pembayaran_berhasil": "Pembayaran berhasil",
    "pesanan_dibayar": "Pesanan dibayar",
    "booking_terkonfirmasi": "Booking terkonfirmasi",
    "booking_checkin": "Tamu check-in",
    "pesanan_selesai": "Pesanan selesai",
    "transaksi_dirilis": "Dana dirilis",
    "payout_dibuat": "Payout dibuat",
    "payout_berhasil": "Payout berhasil",
    "refund_diajukan": "Refund diajukan",
    "refund_selesai": "Refund selesai",
    "tukar_poin_berhasil": "Penukaran poin berhasil",
    "stempel_terverifikasi": "Stempel terverifikasi",
}


class PengirimNotifikasi:
    def __init__(self, store, *, email_aktif: bool = False):
        self.store = store
        self.email_aktif = email_aktif

    async def proses_antrian(self, batas: int = 50) -> int:
        """Poll peristiwa belum diproses dan fan-out ke inbox."""
        antrian = await self.store.peristiwa.belum_diproses(batas=batas)
        for p in antrian:
            await self._fan_out(p)
            await self.store.peristiwa.tandai_diproses(p.id)
        return len(antrian)

    async def _fan_out(self, p: E.Peristiwa) -> None:
        penerima = await self._resolve_penerima(p)
        for uid in penerima:
            await self._kirim_ke(p, uid)

    async def _resolve_penerima(self, p: E.Peristiwa) -> set[UUID]:
        muatan = p.muatan if isinstance(p.muatan, dict) else {}
        jenis = p.jenis
        out: set[UUID] = set()

        def _tambah(uid: Any) -> None:
            if uid is not None:
                out.add(UUID(str(uid)))

        if jenis in ("pembayaran_menunggu_konfirmasi", "refund_diajukan"):
            out |= await self._pengelola_desa(p.desa_id)
        elif jenis == "pembayaran_berhasil":
            _tambah(muatan.get("pembeli_id"))
        elif jenis in ("pesanan_dibayar", "transaksi_dirilis", "payout_dibuat", "payout_berhasil"):
            for pid in muatan.get("penyedia_ids") or []:
                _tambah(pid)
            _tambah(muatan.get("penyedia_id"))
        elif jenis in ("booking_terkonfirmasi", "pesanan_selesai", "refund_selesai", "tukar_poin_berhasil", "stempel_terverifikasi"):
            _tambah(muatan.get("pembeli_id") or muatan.get("pengguna_id"))
            if jenis == "pesanan_selesai":
                for pid in muatan.get("penyedia_ids") or []:
                    _tambah(pid)
        elif jenis == "booking_checkin":
            for pid in muatan.get("penyedia_ids") or []:
                _tambah(pid)
            _tambah(muatan.get("penyedia_id"))

        return out

    async def _pengelola_desa(self, desa_id: UUID) -> set[UUID]:
        ids: set[UUID] = set()
        for peran in (KodePeran.pokdarwis, KodePeran.perangkat_desa, KodePeran.admin):
            for k in await self.store.keanggotaan.daftar_desa(
                desa_id, peran=peran, status=StatusKeanggotaan.aktif,
            ):
                ids.add(k.pengguna_id)
        return ids

    async def _kirim_ke(self, p: E.Peristiwa, penerima_id: UUID) -> None:
        kanal = "in_app"
        if self.email_aktif and p.jenis in _EMAIL_JENIS:
            kanal = "email"
        judul = _JUDUL_DEFAULT.get(p.jenis, p.jenis.replace("_", " ").title())
        isi = (p.muatan or {}).get("isi") or judul
        n = E.Notifikasi(
            desa_id=p.desa_id,
            penerima_id=penerima_id,
            peristiwa_id=p.id,
            tipe=p.jenis,
            judul=judul,
            isi=isi,
            entitas_tipe=p.entitas_tipe,
            entitas_id=p.entitas_id,
            kanal=kanal,
        )
        await self.store.notifikasi.tambah_idempoten(n)
