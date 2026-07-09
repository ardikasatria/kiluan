"""Kupon (validasi/pratinjau/terapkan) + Tukar Poin. Uang bulat, poin idempoten."""
from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from . import errors
from .clock import Jam, id_baru
from .models import Kupon, PemakaianKupon, PenukaranPoin, TransaksiPoin
from .repos import Basis


def _bulat(v: Decimal) -> Decimal:
    return v.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


class KuponService:
    def __init__(self, basis: Basis, jam: Jam) -> None:
        self.b = basis
        self.jam = jam

    async def _validasi(self, kupon: Kupon, subtotal: Decimal, penyedia: set[str]):
        now = self.jam.now()
        if kupon.status != "aktif":
            raise errors.kupon_tidak_berlaku("Kupon tidak aktif.")
        if kupon.berlaku_mulai and now < kupon.berlaku_mulai:
            raise errors.kupon_tidak_berlaku("Belum berlaku.")
        if kupon.berlaku_sampai and now > kupon.berlaku_sampai:
            raise errors.kupon_tidak_berlaku("Kupon kedaluwarsa.")
        if kupon.terpakai >= kupon.batas_pakai:
            raise errors.kupon_tidak_berlaku("Batas pakai tercapai.")
        if kupon.min_belanja is not None and subtotal < kupon.min_belanja:
            raise errors.kupon_tidak_berlaku("Min belanja belum terpenuhi.")
        if kupon.penyedia_terbatas:
            if not penyedia.intersection(set(kupon.penyedia_terbatas)):
                raise errors.kupon_tidak_berlaku("Penyedia di luar cakupan kupon.")

    def _hitung(self, kupon: Kupon, subtotal: Decimal) -> Decimal:
        if kupon.tipe_diskon == "persen":
            diskon = _bulat(subtotal * kupon.nilai / Decimal(100))
        else:
            diskon = _bulat(kupon.nilai)
        return min(diskon, subtotal)

    async def cek(self, desa_id: str, kode: str, subtotal: Decimal, penyedia: set[str]) -> dict:
        kupon = next((k for k in await self.b.kupon.daftar(desa_id) if k.kode == kode), None)
        if kupon is None:
            raise errors.tidak_ditemukan("Kupon tak ada.")
        await self._validasi(kupon, subtotal, penyedia)
        return {"berlaku": True, "diskon": self._hitung(kupon, subtotal)}

    async def terapkan(self, kupon: Kupon, pesanan_id, pengguna_id, subtotal, penyedia) -> Decimal:
        await self._validasi(kupon, subtotal, penyedia)
        # UNIQUE(kupon,pesanan)
        for pk in self.b.pemakaian_kupon.semua():
            if pk.kupon_id == kupon.id and pk.pesanan_id == pesanan_id:
                raise errors.konflik("Kupon sudah dipakai pada pesanan ini.")
        diskon = self._hitung(kupon, subtotal)
        await self.b.pemakaian_kupon.simpan(
            PemakaianKupon(id_baru(), kupon.id, pesanan_id, pengguna_id, diskon)
        )
        kupon.terpakai += 1
        if kupon.terpakai >= kupon.batas_pakai:
            kupon.status = "habis"
        return diskon


class PoinService:
    def __init__(self, basis: Basis, jam: Jam) -> None:
        self.b = basis
        self.jam = jam

    async def saldo(self, desa_id: str, pengguna_id: str) -> int:
        rows = await self.b.transaksi_poin.daftar(desa_id, pengguna_id=pengguna_id)
        return sum(r.poin for r in rows)

    async def tukar(self, desa_id, aktor, hadiah_id, idempotency_key=None):
        self.b.idem.wajib_key(idempotency_key)
        cache = self.b.idem.ambil(idempotency_key, aktor.pengguna_id, "tukar")
        if cache is not None:
            return cache

        hadiah = await self.b.hadiah.ambil(hadiah_id, desa_id)
        if hadiah is None or not hadiah.aktif:
            raise errors.tidak_ditemukan("Hadiah tak tersedia.")

        # syarat tingkat owner
        tingkat_min = hadiah.syarat.get("tingkat_min")
        if tingkat_min:
            urutan = {"tunas": 1, "bahari": 2, "lumba_lumba": 3}
            tingkat = self.b.sertifikasi.get((desa_id, aktor.pengguna_id))
            if not tingkat or urutan.get(tingkat, 0) < urutan.get(tingkat_min, 99):
                raise errors.validasi_gagal("Tingkat owner belum memenuhi syarat.")

        saldo = await self.saldo(desa_id, aktor.pengguna_id)
        if saldo < hadiah.biaya_poin:
            raise errors.saldo_poin_kurang()
        if hadiah.stok is not None and hadiah.stok <= 0:
            raise errors.stok_habis()

        pen = PenukaranPoin(
            id_baru(), desa_id, aktor.pengguna_id, hadiah_id, hadiah.biaya_poin, self.jam.now()
        )
        await self.b.penukaran.simpan(pen)
        # ledger poin negatif (idempotensi F1: unik per referensi)
        await self.b.transaksi_poin.simpan(
            TransaksiPoin(
                id_baru(), desa_id, aktor.pengguna_id, "tukar_hadiah",
                -hadiah.biaya_poin, "penukaran_poin", pen.id,
            )
        )
        if hadiah.stok is not None:
            hadiah.stok -= 1

        kupon = None
        if hadiah.jenis == "kupon_diskon":
            kupon = Kupon(
                id_baru(), desa_id, "TUKAR-" + id_baru("")[-5:].upper(), "tukar_poin",
                "persen", Decimal(10), batas_pakai=1, dibuat_pada=self.jam.now(),
                pemilik_id=aktor.pengguna_id,
            )
            await self.b.kupon.simpan(kupon)
            pen.kupon_id = kupon.id

        hasil = {"penukaran": pen, "kupon": kupon}
        return self.b.idem.simpan(idempotency_key, aktor.pengguna_id, "tukar", hasil)
