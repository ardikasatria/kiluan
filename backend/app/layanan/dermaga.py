"""Dermaga F2 — checkout, pembayaran manual, booking (SQL + faithful scaffold)."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Optional
from uuid import UUID, uuid4

from app.domain.enums import KodePeran
from app.domain.errors import (
    IdempotencyKeyWajib,
    KesalahanValidasi,
    SlotPenuh,
    StokHabis,
    TidakBerwenang,
    TidakDitemukan,
    TransisiIlegalF2,
    WebhookSignatureInvalid,
)
from app.domain.konteks import Konteks
from app.inti.idempotensi import toko_idempotensi
from app.inti.outbox import Outbox
from app.model import tabel as M
from app.inti.pembayaran import verifikasi_signature_webhook
from app.layanan.poin import PoinLayanan
from app.repo.f2_sql import (
    RepoBookingSQL,
    RepoPembayaranSQL,
    RepoPengaturanDesaSQL,
    RepoPesananItemSQL,
    RepoPesananSQL,
    RepoSlotJadwalSQL,
    RepoTransaksiSQL,
    RepoWebhookPembayaranSQL,
    _bulat,
    _kode_checkin,
    _kode_pesanan,
    _now,
)

ITEM_TIPE = frozenset({"produk_jasa", "paket_wisata", "layanan", "tiket_masuk"})
VERIFIKATOR = frozenset({KodePeran.agen, KodePeran.pokdarwis, KodePeran.perangkat_desa, KodePeran.admin})
BENDAHARA = frozenset({KodePeran.pokdarwis, KodePeran.perangkat_desa, KodePeran.admin})


def _pengelola(konteks: Konteks, desa_id: UUID) -> bool:
    return konteks.admin_global() or bool(konteks.peran_di(desa_id) & BENDAHARA)


class DermagaLayanan:
    def __init__(self, store):
        self.store = store
        s = store.sesi
        self.pengaturan = RepoPengaturanDesaSQL(s)
        self.slot = RepoSlotJadwalSQL(s)
        self.pesanan = RepoPesananSQL(s)
        self.item = RepoPesananItemSQL(s)
        self.booking = RepoBookingSQL(s)
        self.pembayaran = RepoPembayaranSQL(s)
        self.transaksi = RepoTransaksiSQL(s)
        self.webhook = RepoWebhookPembayaranSQL(s)
        self.poin = PoinLayanan(store)
        self.outbox = Outbox(store)

    async def _resolve_item(self, desa_id: UUID, spec: dict) -> dict:
        tipe = spec["item_tipe"]
        if tipe not in ITEM_TIPE:
            raise KesalahanValidasi(f"item_tipe {tipe} tak dikenal.")
        jumlah = int(spec.get("jumlah", 1))
        if jumlah < 1:
            raise KesalahanValidasi("jumlah minimal 1.")
        item_id = UUID(spec["item_id"])
        if tipe == "produk_jasa":
            src = await self.store.produk_jasa.ambil(item_id)
            if src is None or src.desa_id != desa_id:
                raise TidakDitemukan("Produk tak ada / lintas-desa.")
            return {
                "item_tipe": tipe, "item_id": item_id,
                "penyedia_tipe": "umkm", "penyedia_id": src.umkm_id,
                "nama": src.nama, "harga": Decimal(str(src.harga)),
                "jumlah": jumlah, "stok": src.stok,
                "slot_jadwal_id": UUID(spec["slot_jadwal_id"]) if spec.get("slot_jadwal_id") else None,
                "metadata": spec.get("metadata", {}),
            }
        if tipe == "paket_wisata":
            src = await self.store.paket_wisata.ambil(item_id)
            if src is None or src.desa_id != desa_id:
                raise TidakDitemukan("Paket tak ada / lintas-desa.")
            return {
                "item_tipe": tipe, "item_id": item_id,
                "penyedia_tipe": "pengguna", "penyedia_id": src.agen_id,
                "nama": src.nama, "harga": Decimal(str(src.harga)),
                "jumlah": jumlah, "stok": None,
                "slot_jadwal_id": UUID(spec["slot_jadwal_id"]) if spec.get("slot_jadwal_id") else None,
                "metadata": spec.get("metadata", {}),
            }
        raise KesalahanValidasi(f"item_tipe {tipe} belum didukung.")

    async def daftar_slot(
        self, desa_id: UUID, subjek_tipe: str, subjek_id: UUID,
        dari: str | None = None, sampai: str | None = None,
        kelola: bool = False,
    ) -> list[M.SlotJadwal]:
        rows = await self.slot.daftar(desa_id, subjek_tipe=subjek_tipe, subjek_id=subjek_id)
        return [
            s for s in rows
            if (kelola or s.status in ("buka", "penuh"))
            and (dari is None or str(s.tanggal) >= dari)
            and (sampai is None or str(s.tanggal) <= sampai)
        ]

    async def buat_slot(self, desa_id: UUID, data: dict) -> M.SlotJadwal:
        slot = M.SlotJadwal(
            id=uuid4(),
            desa_id=desa_id,
            subjek_tipe=data["subjek_tipe"],
            subjek_id=UUID(data["subjek_id"]),
            tanggal=data["tanggal"] if isinstance(data["tanggal"], date) else date.fromisoformat(data["tanggal"]),
            kuota=data["kuota"],
            waktu_mulai=data.get("waktu_mulai"),
            harga_override=Decimal(str(data["harga_override"])) if data.get("harga_override") else None,
        )
        return await self.slot.simpan(slot)

    async def buat_slot_batch(self, desa_id: UUID, data: dict) -> list[M.SlotJadwal]:
        dari = date.fromisoformat(data["dari"])
        sampai = date.fromisoformat(data["sampai"])
        if sampai < dari:
            raise KesalahanValidasi("Rentang tanggal tidak valid.")
        hasil: list[M.SlotJadwal] = []
        cur = dari
        while cur <= sampai:
            hasil.append(await self.buat_slot(desa_id, {
                **data,
                "tanggal": cur.isoformat(),
            }))
            cur += timedelta(days=1)
        return hasil

    async def ubah_slot(
        self, konteks: Konteks, desa_id: UUID, slot_id: UUID, ubah: dict,
    ) -> M.SlotJadwal:
        if not (konteks.admin_global() or konteks.peran_di(desa_id) & VERIFIKATOR):
            raise TidakBerwenang()
        slot = await self.slot.ambil(slot_id, desa_id)
        if slot is None:
            raise TidakDitemukan("Slot tidak ditemukan.")
        if "kuota" in ubah and ubah["kuota"] is not None:
            if int(ubah["kuota"]) < slot.kuota_terpakai:
                raise KesalahanValidasi("Kuota tidak boleh kurang dari terpakai.")
            slot.kuota = int(ubah["kuota"])
            if slot.kuota_terpakai >= slot.kuota:
                slot.status = "penuh"
            elif slot.status == "penuh":
                slot.status = "buka"
        if "harga_override" in ubah:
            slot.harga_override = (
                Decimal(str(ubah["harga_override"])) if ubah["harga_override"] is not None else None
            )
        if "status" in ubah and ubah["status"] is not None:
            slot.status = ubah["status"]
        return slot

    async def hapus_slot(self, konteks: Konteks, desa_id: UUID, slot_id: UUID) -> None:
        if not (konteks.admin_global() or konteks.peran_di(desa_id) & VERIFIKATOR):
            raise TidakBerwenang()
        slot = await self.slot.ambil(slot_id, desa_id)
        if slot is None:
            raise TidakDitemukan("Slot tidak ditemukan.")
        if slot.kuota_terpakai > 0:
            raise TransisiIlegalF2("Slot sudah memiliki booking — tidak bisa dihapus.")
        await self.store.sesi.delete(slot)

    async def daftar_pesanan_penyedia(
        self,
        konteks: Konteks,
        desa_id: UUID,
        penyedia_tipe: str | None = None,
        penyedia_id: UUID | None = None,
        status: str | None = None,
    ) -> list[tuple[M.Pesanan, list[M.PesananItem], dict]]:
        if not (konteks.admin_global() or konteks.peran_di(desa_id) & VERIFIKATOR):
            if penyedia_tipe is None or penyedia_id is None:
                raise TidakBerwenang()
        if penyedia_tipe and penyedia_id:
            items = await self.item.daftar_penyedia(
                desa_id, penyedia_tipe, penyedia_id, status_pesanan=status,
            )
            pesanan_ids = list(dict.fromkeys(it.pesanan_id for it in items))
        else:
            rows = await self.pesanan.daftar(desa_id, status=status)
            pesanan_ids = [p.id for p in rows if p.status in ("dibayar", "diproses", "selesai")]
            items = []
            for pid in pesanan_ids:
                items.extend(await self.item.daftar_pesanan(pid))
        hasil: list[tuple[M.Pesanan, list[M.PesananItem], dict]] = []
        seen: set[UUID] = set()
        for it in items:
            if it.pesanan_id in seen:
                continue
            if penyedia_tipe and penyedia_id:
                if it.penyedia_tipe != penyedia_tipe or it.penyedia_id != penyedia_id:
                    continue
            seen.add(it.pesanan_id)
            pesanan = await self.pesanan.ambil(it.pesanan_id, desa_id)
            if pesanan is None:
                continue
            if status and pesanan.status != status:
                continue
            all_items = await self.item.daftar_pesanan(pesanan.id)
            if penyedia_tipe and penyedia_id:
                all_items = [
                    x for x in all_items
                    if x.penyedia_tipe == penyedia_tipe and x.penyedia_id == penyedia_id
                ]
            bmap: dict = {}
            for x in all_items:
                if x.item_tipe == "paket_wisata":
                    bk_rows = await self.booking.daftar(desa_id, status=None)
                    for bk in bk_rows:
                        if bk.pesanan_item_id == x.id:
                            bmap[x.id] = bk
            hasil.append((pesanan, all_items, bmap))
        return hasil

    async def ubah_fulfillment(
        self,
        konteks: Konteks,
        desa_id: UUID,
        pesanan_id: UUID,
        item_id: UUID,
        status_fulfillment: str,
    ) -> M.PesananItem:
        if not (konteks.admin_global() or konteks.peran_di(desa_id) & VERIFIKATOR):
            raise TidakBerwenang()
        it = await self.item.wajib(item_id, desa_id)
        if it.pesanan_id != pesanan_id:
            raise KesalahanValidasi("Item tidak termasuk pesanan ini.")
        it.status_fulfillment = status_fulfillment
        return it

    async def checkout(
        self,
        konteks: Konteks,
        desa_id: UUID,
        spec: dict,
        idempotency_key: str | None = None,
    ) -> M.Pesanan:
        if konteks.pengguna_id is None:
            raise TidakBerwenang()
        toko_idempotensi.wajib_key(idempotency_key)
        ep = f"checkout:{desa_id}"
        cache = toko_idempotensi.ambil(idempotency_key, str(konteks.pengguna_id), ep)
        if cache is not None:
            return cache

        if not spec.get("item"):
            raise KesalahanValidasi("Item kosong.")

        pengaturan = await self.pengaturan.wajib(desa_id)
        resolved = [await self._resolve_item(desa_id, it) for it in spec["item"]]
        subtotal = sum(_bulat(r["harga"] * r["jumlah"]) for r in resolved)
        penyedia = {f"{r['penyedia_tipe']}:{r['penyedia_id']}" for r in resolved}

        kupon = None
        if spec.get("kupon_id"):
            kupon = await self.poin.kupon.wajib(UUID(spec["kupon_id"]), desa_id)
            await self.poin.validasi_kupon(kupon, subtotal, penyedia)
        elif spec.get("kupon_kode"):
            kupon = await self.poin.kupon.ambil_kode(spec["kupon_kode"], desa_id)
            if kupon is None:
                raise TidakDitemukan("Kupon tak ada.")
            await self.poin.validasi_kupon(kupon, subtotal, penyedia)

        direserve: list[tuple[UUID, int]] = []
        try:
            for r in resolved:
                if r["slot_jadwal_id"]:
                    await self.slot.reserve(r["slot_jadwal_id"], desa_id, r["jumlah"])
                    direserve.append((r["slot_jadwal_id"], r["jumlah"]))
                elif r["item_tipe"] == "produk_jasa" and r["stok"] is not None and r["stok"] < r["jumlah"]:
                    raise StokHabis("Stok tak cukup.")
        except (SlotPenuh, StokHabis):
            for sid, j in direserve:
                await self.slot.release(sid, desa_id, j)
            raise

        now = _now()
        kedaluwarsa = now + timedelta(minutes=pengaturan.batas_hold_menit)
        ongkir = _bulat(Decimal(str(spec.get("ongkir", 0))))
        diskon = Decimal(0)

        pesanan = M.Pesanan(
            id=uuid4(),
            desa_id=desa_id,
            pembeli_id=konteks.pengguna_id,
            kode_pesanan=_kode_pesanan(),
            status="menunggu_pembayaran",
            metode_ambil=spec.get("metode_ambil", "ambil_ditempat"),
            alamat_kirim=spec.get("alamat_kirim"),
            kontak=spec.get("kontak", {}),
            subtotal=subtotal,
            diskon=diskon,
            ongkir=ongkir,
            total=subtotal - diskon + ongkir,
            kedaluwarsa_pada=kedaluwarsa,
            dibuat_pada=now,
            diperbarui_pada=now,
        )
        await self.pesanan.simpan(pesanan)

        if kupon and konteks.pengguna_id:
            diskon = await self.poin.terapkan_kupon(
                kupon, pesanan.id, konteks.pengguna_id, subtotal, penyedia,
            )
            pesanan.kupon_id = kupon.id
            pesanan.diskon = diskon
            pesanan.total = subtotal - diskon + ongkir

        for r in resolved:
            sub = _bulat(r["harga"] * r["jumlah"])
            it = M.PesananItem(
                id=uuid4(),
                desa_id=desa_id,
                pesanan_id=pesanan.id,
                item_tipe=r["item_tipe"],
                item_id=r["item_id"],
                penyedia_tipe=r["penyedia_tipe"],
                penyedia_id=r["penyedia_id"],
                nama_snapshot=r["nama"],
                harga_snapshot=r["harga"],
                jumlah=r["jumlah"],
                subtotal=sub,
                slot_jadwal_id=r["slot_jadwal_id"],
                metadata_item=r["metadata"],
            )
            await self.item.simpan(it)
            if r["slot_jadwal_id"]:
                slot = await self.slot.ambil(r["slot_jadwal_id"], desa_id)
                bk = M.Booking(
                    id=uuid4(),
                    desa_id=desa_id,
                    pesanan_item_id=it.id,
                    slot_jadwal_id=r["slot_jadwal_id"],
                    jumlah_orang=int(r["metadata"].get("jumlah_orang", 1)),
                    tanggal_kunjungan=slot.tanggal,
                    kode_checkin=_kode_checkin(),
                    status="dipesan",
                    dibuat_pada=now,
                )
                await self.booking.simpan(bk)

        return toko_idempotensi.simpan(idempotency_key, str(konteks.pengguna_id), ep, pesanan)

    async def ambil_pesanan(self, desa_id: UUID, id_or_kode: str) -> tuple[M.Pesanan, list[M.PesananItem], dict[UUID, M.Booking]]:
        pesanan = await self.pesanan.wajib(id_or_kode, desa_id)
        items = await self.item.daftar_pesanan(pesanan.id)
        bmap: dict[UUID, M.Booking] = {}
        for bk in await self.booking.daftar(desa_id):
            bmap[bk.pesanan_item_id] = bk
        return pesanan, items, bmap

    async def batalkan(self, konteks: Konteks, desa_id: UUID, pesanan_id: UUID) -> M.Pesanan:
        pesanan = await self.pesanan.wajib(pesanan_id, desa_id)
        if konteks.pengguna_id != pesanan.pembeli_id and not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        if pesanan.status != "menunggu_pembayaran":
            raise TransisiIlegalF2("Hanya pesanan menunggu bisa dibatalkan.")
        await self._lepas_hold(pesanan)
        pesanan.status = "dibatalkan"
        return pesanan

    async def _lepas_hold(self, pesanan: M.Pesanan) -> None:
        for it in await self.item.daftar_pesanan(pesanan.id):
            if it.slot_jadwal_id:
                await self.slot.release(it.slot_jadwal_id, pesanan.desa_id, it.jumlah)

    async def sapu_kedaluwarsa(self, desa_id: UUID) -> int:
        n = 0
        for pesanan in await self.pesanan.daftar_kedaluwarsa(desa_id):
            await self._lepas_hold(pesanan)
            pesanan.status = "kedaluwarsa"
            n += 1
        return n

    async def buat_pembayaran(
        self,
        konteks: Konteks,
        desa_id: UUID,
        pesanan_id: UUID,
        metode: str,
        idempotency_key: str | None = None,
    ) -> M.Pembayaran:
        if konteks.pengguna_id is None:
            raise TidakBerwenang()
        toko_idempotensi.wajib_key(idempotency_key)
        ep = f"bayar:{pesanan_id}"
        cache = toko_idempotensi.ambil(idempotency_key, str(konteks.pengguna_id), ep)
        if cache is not None:
            return cache

        pesanan = await self.pesanan.wajib(pesanan_id, desa_id)
        if konteks.pengguna_id != pesanan.pembeli_id:
            raise TidakBerwenang()
        if pesanan.status != "menunggu_pembayaran":
            raise TransisiIlegalF2("Pesanan tak menunggu pembayaran.")
        pengaturan = await self.pengaturan.wajib(desa_id)
        p = M.Pembayaran(
            id=uuid4(),
            desa_id=desa_id,
            pesanan_id=pesanan.id,
            metode=metode,
            penyedia_gateway=pengaturan.gateway,
            jumlah=pesanan.total,
            kedaluwarsa_pada=pesanan.kedaluwarsa_pada,
            ref_eksternal=f"{pengaturan.gateway}-{uuid4().hex[:8]}",
            dibuat_pada=_now(),
        )
        await self.pembayaran.simpan(p)
        if metode == "transfer_manual":
            await self.outbox.emit(
                desa_id,
                "pembayaran_menunggu_konfirmasi",
                "pembayaran",
                p.id,
                {
                    "pembeli_id": str(pesanan.pembeli_id),
                    "pesanan_id": str(pesanan.id),
                    "jumlah": str(pesanan.total),
                },
            )
        return toko_idempotensi.simpan(idempotency_key, str(konteks.pengguna_id), ep, p)

    async def unggah_bukti(
        self, konteks: Konteks, desa_id: UUID, pembayaran_id: UUID, media_id: UUID,
    ) -> M.Pembayaran:
        p = await self.pembayaran.wajib(pembayaran_id, desa_id)
        pesanan = await self.pesanan.wajib(p.pesanan_id, desa_id)
        if konteks.pengguna_id != pesanan.pembeli_id:
            raise TidakBerwenang()
        p.bukti_media_id = media_id
        return p

    async def konfirmasi_manual(
        self,
        konteks: Konteks,
        desa_id: UUID,
        pembayaran_id: UUID,
        idempotency_key: str | None = None,
    ) -> M.Pembayaran:
        toko_idempotensi.wajib_key(idempotency_key)
        ep = f"konf:{pembayaran_id}"
        cache = toko_idempotensi.ambil(idempotency_key, str(konteks.pengguna_id), ep)
        if cache is not None:
            return cache
        if not (konteks.admin_global() or konteks.peran_di(desa_id) & BENDAHARA):
            raise TidakBerwenang("Hanya bendahara/pengelola.")
        p = await self.pembayaran.wajib(pembayaran_id, desa_id)
        pesanan = await self.pesanan.wajib(p.pesanan_id, desa_id)
        if konteks.pengguna_id == pesanan.pembeli_id:
            raise TidakBerwenang("Pembeli tak boleh konfirmasi sendiri.")
        await self._settle(desa_id, p, pesanan)
        return toko_idempotensi.simpan(idempotency_key, str(konteks.pengguna_id), ep, p)

    async def daftar_pembayaran_antrean(
        self, konteks: Konteks, desa_id: UUID, status: str | None = "menunggu",
    ) -> list[M.Pembayaran]:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        return await self.pembayaran.daftar(desa_id, status=status, ada_bukti=True)

    async def proses_webhook(self, gateway: str, event: dict) -> dict:
        if not verifikasi_signature_webhook(gateway, event.get("signature")):
            raise WebhookSignatureInvalid()
        event_id = event["event_id"]
        if await self.webhook.sudah_ada(event_id):
            return {"status": "diabaikan"}
        ref = event["ref_eksternal"]
        p = await self.pembayaran.ambil_ref_eksternal(ref)
        if p is None:
            raise TidakDitemukan("Pembayaran tak dikenal.")
        await self.webhook.simpan(M.WebhookPembayaran(
            id=uuid4(),
            penyedia_gateway=gateway,
            event_id=event_id,
            ref_eksternal=ref,
            jenis_event=event.get("jenis_event", "unknown"),
            muatan=event,
            status_proses="diproses",
            diterima_pada=_now(),
            diproses_pada=_now(),
        ))
        pesanan = await self.pesanan.wajib(p.pesanan_id, p.desa_id)
        jenis = event.get("jenis_event")
        if jenis == "berhasil":
            await self._settle(p.desa_id, p, pesanan)
        elif jenis in ("gagal", "kedaluwarsa"):
            p.status = "gagal" if jenis == "gagal" else "kedaluwarsa"
        return {"status": "diproses"}

    async def _settle(self, desa_id: UUID, p: M.Pembayaran, pesanan: M.Pesanan) -> None:
        if p.status == "berhasil":
            return
        pengaturan = await self.pengaturan.wajib(desa_id)
        p.status = "berhasil"
        p.dibayar_pada = _now()
        items = await self.item.daftar_pesanan(pesanan.id)
        for it in items:
            if it.item_tipe == "produk_jasa":
                src = await self.store.produk_jasa.ambil(it.item_id)
                if src and src.stok is not None:
                    src.stok -= it.jumlah
        grup: dict[tuple[str, UUID], Decimal] = {}
        for it in items:
            k = (it.penyedia_tipe, it.penyedia_id)
            grup[k] = grup.get(k, Decimal(0)) + it.subtotal
        for (ptipe, pid), bruto in grup.items():
            fee = _bulat(bruto * pengaturan.persen_fee_platform)
            reinvest = _bulat(bruto * pengaturan.persen_reinvestasi)
            neto = bruto - fee - reinvest
            await self.transaksi.simpan(M.Transaksi(
                id=uuid4(), desa_id=desa_id, pesanan_id=pesanan.id, pembayaran_id=p.id,
                penyedia_tipe=ptipe, penyedia_id=pid, jenis="penjualan", bruto=bruto,
                fee_platform=fee, porsi_reinvestasi=reinvest, neto_penyedia=neto,
                status="tertahan_escrow", dibuat_pada=_now(),
            ))
        pesanan.status = "dibayar"
        penyedia_ids = [str(pid) for (_, pid) in grup.keys()]
        booking_dikonfirmasi = False
        for bk in await self.booking.daftar(desa_id):
            it_ids = {i.id for i in items}
            if bk.pesanan_item_id in it_ids and bk.status == "dipesan":
                bk.status = "terkonfirmasi"
                booking_dikonfirmasi = True
        await self.outbox.emit(
            desa_id,
            "pembayaran_berhasil",
            "pembayaran",
            p.id,
            {"pembeli_id": str(pesanan.pembeli_id), "pesanan_id": str(pesanan.id)},
        )
        if penyedia_ids:
            await self.outbox.emit(
                desa_id,
                "pesanan_dibayar",
                "pesanan",
                pesanan.id,
                {"penyedia_ids": penyedia_ids, "pesanan_id": str(pesanan.id)},
            )
        if booking_dikonfirmasi:
            await self.outbox.emit(
                desa_id,
                "booking_terkonfirmasi",
                "pesanan",
                pesanan.id,
                {"pembeli_id": str(pesanan.pembeli_id)},
            )

    async def checkin(self, konteks: Konteks, desa_id: UUID, booking_id: str | UUID) -> M.Booking:
        if not (konteks.admin_global() or konteks.peran_di(desa_id) & VERIFIKATOR):
            raise TidakBerwenang()
        bk = await self.booking.wajib(booking_id, desa_id)
        if bk.status != "terkonfirmasi":
            raise TransisiIlegalF2("Booking belum terkonfirmasi.")
        if bk.tanggal_kunjungan != date.today():
            raise TransisiIlegalF2("Check-in hanya pada tanggal kunjungan.")
        bk.status = "checkin"
        bk.checkin_pada = _now()
        it = await self.item.ambil(bk.pesanan_item_id, desa_id)
        muatan: dict[str, str | list[str]] = {"booking_id": str(bk.id)}
        if it is not None:
            muatan["penyedia_id"] = str(it.penyedia_id)
        await self.outbox.emit(desa_id, "booking_checkin", "booking", bk.id, muatan)
        return bk

    async def selesaikan_pesanan(self, desa_id: UUID, pesanan_id: UUID) -> M.Pesanan:
        pesanan = await self.pesanan.wajib(pesanan_id, desa_id)
        if pesanan.status not in ("dibayar", "diproses"):
            raise TransisiIlegalF2("Pesanan belum dibayar.")
        pesanan.status = "selesai"
        for t in await self.transaksi.daftar_pesanan(pesanan_id):
            if t.status == "tertahan_escrow":
                t.status = "dirilis"
        items = await self.item.daftar_pesanan(pesanan_id)
        penyedia_ids = list({str(it.penyedia_id) for it in items})
        muatan: dict[str, str | list[str]] = {
            "pembeli_id": str(pesanan.pembeli_id),
            "pesanan_id": str(pesanan.id),
        }
        if penyedia_ids:
            muatan["penyedia_ids"] = penyedia_ids
        await self.outbox.emit(desa_id, "pesanan_selesai", "pesanan", pesanan.id, muatan)
        if penyedia_ids:
            await self.outbox.emit(
                desa_id,
                "transaksi_dirilis",
                "pesanan",
                pesanan.id,
                {"penyedia_ids": penyedia_ids},
            )
        return pesanan
