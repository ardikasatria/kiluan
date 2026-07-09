"""Dermaga: checkout multi-penyedia + hold kuota, pembayaran (manual & gateway),
split escrow, webhook idempoten, booking check-in, rilis escrow."""
from __future__ import annotations

import asyncio
from decimal import ROUND_HALF_UP, Decimal

from . import enums, errors
from .clock import Jam, id_baru
from .layanan_poin import KuponService
from .models import (
    Booking, Pembayaran, Pesanan, PesananItem, Transaksi, WebhookPembayaran,
    kode_pesanan_baru,
)
from .repos import Basis

_SIGNATURE = {"xendit": "sig-xnd", "midtrans": "sig-mid", "manual": "sig-man"}


def _bulat(v: Decimal) -> Decimal:
    return v.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


class DermagaService:
    def __init__(self, basis: Basis, jam: Jam) -> None:
        self.b = basis
        self.jam = jam
        self.kupon = KuponService(basis, jam)

    # ---------- resolusi katalog ----------
    async def _resolve_item(self, desa_id, spec) -> PesananItem:
        tipe = spec["item_tipe"]
        if tipe not in enums.ITEM_TIPE:
            raise errors.validasi_gagal(f"item_tipe {tipe} tak dikenal.")
        jumlah = int(spec.get("jumlah", 1))
        if jumlah < 1:
            raise errors.validasi_gagal("jumlah minimal 1.")
        if tipe == "produk_jasa":
            src = await self.b.produk.ambil(spec["item_id"], desa_id)
            if src is None:
                raise errors.tidak_ditemukan("Produk tak ada / lintas-desa.")
            penyedia_tipe, penyedia_id, nama, harga = "umkm", src.umkm_id, src.nama, src.harga
        elif tipe == "paket_wisata":
            src = await self.b.paket.ambil(spec["item_id"], desa_id)
            if src is None:
                raise errors.tidak_ditemukan("Paket tak ada / lintas-desa.")
            penyedia_tipe, penyedia_id, nama, harga = "pengguna", src.agen_id, src.nama, src.harga
        else:
            raise errors.validasi_gagal(f"item_tipe {tipe} belum didukung scaffold.")
        harga_eff = harga
        return PesananItem(
            id=id_baru(), desa_id=desa_id, pesanan_id="", item_tipe=tipe, item_id=spec["item_id"],
            penyedia_tipe=penyedia_tipe, penyedia_id=penyedia_id, nama_snapshot=nama,
            harga_snapshot=harga_eff, jumlah=jumlah, subtotal=_bulat(harga_eff * jumlah),
            slot_jadwal_id=spec.get("slot_jadwal_id"), metadata=spec.get("metadata", {}),
        )

    async def _reserve_slot(self, desa_id, slot_id, jumlah):
        async with self.b.slot.lock(slot_id):
            slot = await self.b.slot.ambil(slot_id, desa_id)
            if slot is None:
                raise errors.tidak_ditemukan("Slot tak ada / lintas-desa.")
            await asyncio.sleep(0)  # beri kesempatan interleaving; lock tetap menjamin benar
            if slot.status not in ("buka", "penuh") or slot.kuota_terpakai + jumlah > slot.kuota:
                raise errors.slot_penuh()
            slot.kuota_terpakai += jumlah
            if slot.kuota_terpakai >= slot.kuota:
                slot.status = "penuh"
            return slot

    async def _release_slot(self, desa_id, slot_id, jumlah):
        async with self.b.slot.lock(slot_id):
            slot = await self.b.slot.ambil(slot_id, desa_id)
            if slot:
                slot.kuota_terpakai = max(0, slot.kuota_terpakai - jumlah)
                if slot.kuota_terpakai < slot.kuota and slot.status == "penuh":
                    slot.status = "buka"

    # ---------- checkout ----------
    async def checkout(self, desa_id, aktor, spec, idempotency_key=None):
        self.b.idem.wajib_key(idempotency_key)
        cache = self.b.idem.ambil(idempotency_key, aktor.pengguna_id, "checkout")
        if cache is not None:
            return cache

        pengaturan = await self.b.pengaturan_desa(desa_id)
        if not spec.get("item"):
            raise errors.validasi_gagal("Item kosong.")

        # (a) resolve + snapshot semua item (validasi tenant/eksistensi)
        items = [await self._resolve_item(desa_id, it) for it in spec["item"]]
        subtotal = sum((it.subtotal for it in items), Decimal(0))
        penyedia = {f"{it.penyedia_tipe}:{it.penyedia_id}" for it in items}

        # (b) kupon (validasi dulu, terapkan setelah pesanan lahir agar UNIQUE(kupon,pesanan))
        kupon = None
        if spec.get("kupon_id"):
            kupon = await self.b.kupon.ambil(spec["kupon_id"], desa_id)
            if kupon is None:
                raise errors.tidak_ditemukan("Kupon tak ada.")
            await self.kupon._validasi(kupon, subtotal, penyedia)

        # (c) reserve slot berjadwal (kompensasi bila gagal di tengah)
        direserve = []
        try:
            for it in items:
                if it.slot_jadwal_id:
                    await self._reserve_slot(desa_id, it.slot_jadwal_id, it.jumlah)
                    direserve.append((it.slot_jadwal_id, it.jumlah))
                elif it.item_tipe == "produk_jasa":
                    src = await self.b.produk.ambil(it.item_id, desa_id)
                    if src.stok is not None and src.stok < it.jumlah:
                        raise errors.stok_habis()
        except errors.GalatDomain:
            for sid, j in direserve:
                await self._release_slot(desa_id, sid, j)
            raise

        # (d) persist pesanan + item + booking
        now = self.jam.now()
        kedaluwarsa = now + __import__("datetime").timedelta(minutes=pengaturan.batas_hold_menit)
        pesanan = Pesanan(
            id=id_baru(), desa_id=desa_id, pembeli_id=aktor.pengguna_id,
            kode_pesanan=kode_pesanan_baru(), dibuat_pada=now, kedaluwarsa_pada=kedaluwarsa,
            metode_ambil=spec.get("metode_ambil", "ambil_ditempat"),
            alamat_kirim=spec.get("alamat_kirim"), kontak=spec.get("kontak", {}),
            subtotal=subtotal, ongkir=_bulat(Decimal(spec.get("ongkir", 0))),
        )
        diskon = Decimal(0)
        if kupon:
            diskon = await self.kupon.terapkan(
                kupon, pesanan.id, aktor.pengguna_id, subtotal, penyedia
            )
            pesanan.kupon_id = kupon.id
        pesanan.diskon = diskon
        pesanan.total = subtotal - diskon + pesanan.ongkir

        for it in items:
            it.pesanan_id = pesanan.id
            await self.b.item.simpan(it)
            pesanan.item.append(it)
            if it.slot_jadwal_id:
                slot = await self.b.slot.ambil(it.slot_jadwal_id, desa_id)
                bk = Booking(
                    id=id_baru(), desa_id=desa_id, pesanan_item_id=it.id,
                    slot_jadwal_id=it.slot_jadwal_id, kode_checkin="CI-" + id_baru("")[-6:].upper(),
                    tanggal_kunjungan=slot.tanggal, jumlah_orang=it.metadata.get("jumlah_orang", 1),
                )
                await self.b.booking.simpan(bk)
        await self.b.pesanan.simpan(pesanan)
        return self.b.idem.simpan(idempotency_key, aktor.pengguna_id, "checkout", pesanan)

    async def batalkan(self, desa_id, aktor, pesanan_id):
        pesanan = await self.b.pesanan.wajib(pesanan_id, desa_id)
        if aktor.pengguna_id != pesanan.pembeli_id and not aktor.punya(*enums.PENGELOLA):
            raise errors.tidak_berwenang()
        if pesanan.status != "menunggu_pembayaran":
            raise errors.transisi_ilegal("Hanya pesanan menunggu bisa dibatalkan.")
        await self._lepas_hold(pesanan)
        pesanan.status = "dibatalkan"
        return pesanan

    async def sapu_kedaluwarsa(self, desa_id):
        now = self.jam.now()
        for pesanan in await self.b.pesanan.daftar(desa_id, status="menunggu_pembayaran"):
            if now >= pesanan.kedaluwarsa_pada:
                await self._lepas_hold(pesanan)
                pesanan.status = "kedaluwarsa"

    async def _lepas_hold(self, pesanan):
        for it in pesanan.item:
            if it.slot_jadwal_id:
                await self._release_slot(pesanan.desa_id, it.slot_jadwal_id, it.jumlah)

    # ---------- pembayaran ----------
    async def buat_pembayaran(self, desa_id, aktor, pesanan_id, metode, idempotency_key=None):
        self.b.idem.wajib_key(idempotency_key)
        cache = self.b.idem.ambil(idempotency_key, aktor.pengguna_id, f"bayar:{pesanan_id}")
        if cache is not None:
            return cache
        pesanan = await self.b.pesanan.wajib(pesanan_id, desa_id)
        if aktor.pengguna_id != pesanan.pembeli_id:
            raise errors.tidak_berwenang()
        if pesanan.status != "menunggu_pembayaran":
            raise errors.transisi_ilegal("Pesanan tak menunggu pembayaran.")
        pengaturan = await self.b.pengaturan_desa(desa_id)
        gw = pengaturan.gateway
        p = Pembayaran(
            id=id_baru(), desa_id=desa_id, pesanan_id=pesanan_id, metode=metode,
            penyedia_gateway=gw, jumlah=pesanan.total, kedaluwarsa_pada=pesanan.kedaluwarsa_pada,
            ref_eksternal=f"{gw}-{id_baru('')[-8:]}",
        )
        if gw != "manual":
            p.redirect_url = f"https://checkout.{gw}.co/{p.ref_eksternal}"
        await self.b.pembayaran.simpan(p)
        return self.b.idem.simpan(idempotency_key, aktor.pengguna_id, f"bayar:{pesanan_id}", p)

    async def unggah_bukti(self, desa_id, aktor, pembayaran_id, media_id):
        p = await self.b.pembayaran.wajib(pembayaran_id, desa_id)
        pesanan = await self.b.pesanan.wajib(p.pesanan_id, desa_id)
        if aktor.pengguna_id != pesanan.pembeli_id:
            raise errors.tidak_berwenang()
        p.bukti_media_id = media_id
        return p

    async def konfirmasi_manual(self, desa_id, aktor, pembayaran_id, idempotency_key=None):
        self.b.idem.wajib_key(idempotency_key)
        cache = self.b.idem.ambil(idempotency_key, aktor.pengguna_id, f"konf:{pembayaran_id}")
        if cache is not None:
            return cache
        if not aktor.punya(*enums.BENDAHARA):
            raise errors.tidak_berwenang("Hanya bendahara/pengelola.")
        p = await self.b.pembayaran.wajib(pembayaran_id, desa_id)
        pesanan = await self.b.pesanan.wajib(p.pesanan_id, desa_id)
        if aktor.pengguna_id == pesanan.pembeli_id:
            raise errors.tidak_berwenang("Pembeli tak boleh konfirmasi sendiri.")
        await self._settle(desa_id, p, pesanan)
        return self.b.idem.simpan(idempotency_key, aktor.pengguna_id, f"konf:{pembayaran_id}", p)

    async def proses_webhook(self, gateway, event):
        # verifikasi signature
        if event.get("signature") != _SIGNATURE.get(gateway):
            raise errors.webhook_signature_invalid()
        event_id = event["event_id"]
        if event_id in self.b._webhook_events:  # idempotensi tepat-sekali
            return {"status": "diabaikan"}
        self.b._webhook_events.add(event_id)
        ref = event["ref_eksternal"]
        p = next((x for x in self.b.pembayaran.semua() if x.ref_eksternal == ref), None)
        if p is None:
            raise errors.tidak_ditemukan("Pembayaran tak dikenal.")
        await self.b.webhook.simpan(
            WebhookPembayaran(id_baru(), gateway, event_id, ref, event["jenis_event"], "diproses")
        )
        pesanan = await self.b.pesanan.wajib(p.pesanan_id, p.desa_id)
        if event["jenis_event"] == "berhasil":
            await self._settle(p.desa_id, p, pesanan)
        elif event["jenis_event"] in ("gagal", "kedaluwarsa"):
            p.status = "gagal" if event["jenis_event"] == "gagal" else "kedaluwarsa"
        return {"status": "diproses"}

    async def _settle(self, desa_id, p, pesanan):
        if p.status == "berhasil":
            return  # idempoten
        pengaturan = await self.b.pengaturan_desa(desa_id)
        p.status = "berhasil"
        p.dibayar_pada = self.jam.now()
        # potong stok produk fisik
        for it in pesanan.item:
            if it.item_tipe == "produk_jasa":
                src = await self.b.produk.ambil(it.item_id, desa_id)
                if src and src.stok is not None:
                    src.stok -= it.jumlah
        # split escrow per penyedia
        grup: dict[tuple, Decimal] = {}
        for it in pesanan.item:
            grup.setdefault((it.penyedia_tipe, it.penyedia_id), Decimal(0))
            grup[(it.penyedia_tipe, it.penyedia_id)] += it.subtotal
        for (ptipe, pid), bruto in grup.items():
            fee = _bulat(bruto * pengaturan.persen_fee_platform)
            reinvest = _bulat(bruto * pengaturan.persen_reinvestasi)
            neto = bruto - fee - reinvest  # invarian eksak: bruto = fee+reinvest+neto
            await self.b.transaksi.simpan(
                Transaksi(
                    id=id_baru(), desa_id=desa_id, pesanan_id=pesanan.id, pembayaran_id=p.id,
                    penyedia_tipe=ptipe, penyedia_id=pid, jenis="penjualan", bruto=bruto,
                    fee_platform=fee, porsi_reinvestasi=reinvest, neto_penyedia=neto,
                    status="tertahan_escrow", dibuat_pada=self.jam.now(),
                )
            )
        pesanan.status = "dibayar"
        for bk in await self.b.booking.daftar(desa_id):
            it = await self.b.item.ambil(bk.pesanan_item_id, desa_id)
            if it and it.pesanan_id == pesanan.id and bk.status == "dipesan":
                bk.status = "terkonfirmasi"

    # ---------- booking & rilis ----------
    async def checkin(self, desa_id, aktor, booking_id):
        if not aktor.punya(*enums.VERIFIKATOR):
            raise errors.tidak_berwenang()
        bk = next(
            (x for x in await self.b.booking.daftar(desa_id)
             if x.id == booking_id or x.kode_checkin == booking_id), None
        )
        if bk is None:
            raise errors.tidak_ditemukan()
        if bk.status != "terkonfirmasi":
            raise errors.transisi_ilegal("Booking belum terkonfirmasi.")
        bk.status = "checkin"
        bk.checkin_pada = self.jam.now()
        return bk

    async def selesaikan_pesanan(self, desa_id, pesanan_id):
        """pesanan → selesai → rilis escrow (transaksi tertahan → dirilis)."""
        pesanan = await self.b.pesanan.wajib(pesanan_id, desa_id)
        if pesanan.status not in ("dibayar", "diproses"):
            raise errors.transisi_ilegal("Pesanan belum dibayar.")
        pesanan.status = "selesai"
        for t in await self.b.transaksi.daftar(desa_id):
            if t.pesanan_id == pesanan_id and t.status == "tertahan_escrow":
                t.status = "dirilis"
        return pesanan
