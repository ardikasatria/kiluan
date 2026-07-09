"""Repo SQL F2 — Dermaga inti (B9). Hold kuota via SELECT … FOR UPDATE."""
from __future__ import annotations

import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..domain.errors import SlotPenuh, StokHabis, TidakDitemukan, TransisiIlegalF2
from ..model import tabel as M


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _bulat(v: Decimal) -> Decimal:
    return v.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def _kode_pesanan() -> str:
    return "KLN-" + secrets.token_hex(3).upper()


def _kode_checkin() -> str:
    return "CI-" + secrets.token_hex(3).upper()


class RepoPengaturanDesaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def ambil(self, desa_id: UUID) -> Optional[M.PengaturanDesa]:
        return await self.s.get(M.PengaturanDesa, desa_id)

    async def wajib(self, desa_id: UUID) -> M.PengaturanDesa:
        row = await self.ambil(desa_id)
        if row is None:
            raise TidakDitemukan("Pengaturan desa belum diset.")
        return row


class RepoSlotJadwalSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, slot: M.SlotJadwal) -> M.SlotJadwal:
        self.s.add(slot)
        await self.s.flush()
        return slot

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.SlotJadwal]:
        row = await self.s.get(M.SlotJadwal, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def daftar(
        self,
        desa_id: UUID,
        subjek_tipe: str | None = None,
        subjek_id: UUID | None = None,
    ) -> list[M.SlotJadwal]:
        q = select(M.SlotJadwal).where(M.SlotJadwal.desa_id == desa_id)
        if subjek_tipe:
            q = q.where(M.SlotJadwal.subjek_tipe == subjek_tipe)
        if subjek_id:
            q = q.where(M.SlotJadwal.subjek_id == subjek_id)
        res = await self.s.execute(q.order_by(M.SlotJadwal.tanggal))
        return list(res.scalars().all())

    async def reserve(self, id: UUID, desa_id: UUID, jumlah: int) -> M.SlotJadwal:
        """SELECT … FOR UPDATE — anti-overbook."""
        res = await self.s.execute(
            select(M.SlotJadwal)
            .where(M.SlotJadwal.id == id, M.SlotJadwal.desa_id == desa_id)
            .with_for_update()
        )
        slot = res.scalar_one_or_none()
        if slot is None:
            raise TidakDitemukan("Slot tak ada / lintas-desa.")
        if slot.status not in ("buka", "penuh") or slot.kuota_terpakai + jumlah > slot.kuota:
            raise SlotPenuh("Kuota slot habis.")
        slot.kuota_terpakai += jumlah
        if slot.kuota_terpakai >= slot.kuota:
            slot.status = "penuh"
        await self.s.flush()
        return slot

    async def release(self, id: UUID, desa_id: UUID, jumlah: int) -> None:
        res = await self.s.execute(
            select(M.SlotJadwal)
            .where(M.SlotJadwal.id == id, M.SlotJadwal.desa_id == desa_id)
            .with_for_update()
        )
        slot = res.scalar_one_or_none()
        if slot is None:
            return
        slot.kuota_terpakai = max(0, slot.kuota_terpakai - jumlah)
        if slot.kuota_terpakai < slot.kuota and slot.status == "penuh":
            slot.status = "buka"
        await self.s.flush()


class RepoPesananSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, pesanan: M.Pesanan) -> M.Pesanan:
        self.s.add(pesanan)
        await self.s.flush()
        return pesanan

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.Pesanan]:
        row = await self.s.get(M.Pesanan, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def ambil_kode(self, kode: str, desa_id: UUID) -> Optional[M.Pesanan]:
        res = await self.s.execute(
            select(M.Pesanan).where(
                M.Pesanan.kode_pesanan == kode,
                M.Pesanan.desa_id == desa_id,
            )
        )
        return res.scalar_one_or_none()

    async def wajib(self, id_or_kode: str | UUID, desa_id: UUID) -> M.Pesanan:
        if isinstance(id_or_kode, UUID):
            row = await self.ambil(id_or_kode, desa_id)
        else:
            try:
                uid = UUID(id_or_kode)
                row = await self.ambil(uid, desa_id)
            except ValueError:
                row = await self.ambil_kode(id_or_kode, desa_id)
        if row is None:
            raise TidakDitemukan("Pesanan tidak ditemukan.")
        return row

    async def daftar(
        self,
        desa_id: UUID,
        status: str | None = None,
        pembeli_id: UUID | None = None,
    ) -> list[M.Pesanan]:
        q = select(M.Pesanan).where(M.Pesanan.desa_id == desa_id)
        if status:
            q = q.where(M.Pesanan.status == status)
        if pembeli_id:
            q = q.where(M.Pesanan.pembeli_id == pembeli_id)
        res = await self.s.execute(q.order_by(M.Pesanan.dibuat_pada.desc()))
        return list(res.scalars().all())

    async def daftar_kedaluwarsa(self, desa_id: UUID) -> list[M.Pesanan]:
        res = await self.s.execute(
            select(M.Pesanan).where(
                M.Pesanan.desa_id == desa_id,
                M.Pesanan.status == "menunggu_pembayaran",
                M.Pesanan.kedaluwarsa_pada <= _now(),
            )
        )
        return list(res.scalars().all())


class RepoPesananItemSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, item: M.PesananItem) -> M.PesananItem:
        self.s.add(item)
        await self.s.flush()
        return item

    async def daftar_pesanan(self, pesanan_id: UUID) -> list[M.PesananItem]:
        res = await self.s.execute(
            select(M.PesananItem).where(M.PesananItem.pesanan_id == pesanan_id)
        )
        return list(res.scalars().all())

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.PesananItem]:
        row = await self.s.get(M.PesananItem, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row


class RepoBookingSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, bk: M.Booking) -> M.Booking:
        self.s.add(bk)
        await self.s.flush()
        return bk

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.Booking]:
        row = await self.s.get(M.Booking, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def ambil_kode(self, kode: str, desa_id: UUID) -> Optional[M.Booking]:
        res = await self.s.execute(
            select(M.Booking).where(
                M.Booking.kode_checkin == kode,
                M.Booking.desa_id == desa_id,
            )
        )
        return res.scalar_one_or_none()

    async def wajib(self, id_or_kode: str | UUID, desa_id: UUID) -> M.Booking:
        if isinstance(id_or_kode, UUID):
            row = await self.ambil(id_or_kode, desa_id)
        else:
            try:
                row = await self.ambil(UUID(id_or_kode), desa_id)
            except ValueError:
                row = await self.ambil_kode(id_or_kode, desa_id)
        if row is None:
            raise TidakDitemukan("Booking tidak ditemukan.")
        return row

    async def daftar(
        self,
        desa_id: UUID,
        tanggal: date | None = None,
        status: str | None = None,
    ) -> list[M.Booking]:
        q = select(M.Booking).where(M.Booking.desa_id == desa_id)
        if tanggal:
            q = q.where(M.Booking.tanggal_kunjungan == tanggal)
        if status:
            q = q.where(M.Booking.status == status)
        res = await self.s.execute(q.order_by(M.Booking.dibuat_pada.desc()))
        return list(res.scalars().all())


class RepoPembayaranSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, p: M.Pembayaran) -> M.Pembayaran:
        self.s.add(p)
        await self.s.flush()
        return p

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.Pembayaran]:
        row = await self.s.get(M.Pembayaran, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.Pembayaran:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Pembayaran tidak ditemukan.")
        return row

    async def daftar_pesanan(self, pesanan_id: UUID) -> list[M.Pembayaran]:
        res = await self.s.execute(
            select(M.Pembayaran).where(M.Pembayaran.pesanan_id == pesanan_id)
        )
        return list(res.scalars().all())

    async def daftar(
        self,
        desa_id: UUID,
        status: str | None = None,
        ada_bukti: bool = False,
    ) -> list[M.Pembayaran]:
        q = select(M.Pembayaran).where(M.Pembayaran.desa_id == desa_id)
        if status:
            q = q.where(M.Pembayaran.status == status)
        if ada_bukti:
            q = q.where(M.Pembayaran.bukti_media_id.isnot(None))
        res = await self.s.execute(q.order_by(M.Pembayaran.dibuat_pada.desc()))
        return list(res.scalars().all())

    async def ambil_ref_eksternal(self, ref: str) -> Optional[M.Pembayaran]:
        res = await self.s.execute(
            select(M.Pembayaran).where(M.Pembayaran.ref_eksternal == ref)
        )
        return res.scalar_one_or_none()


class RepoTransaksiSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, t: M.Transaksi) -> M.Transaksi:
        self.s.add(t)
        await self.s.flush()
        return t

    async def daftar_pesanan(self, pesanan_id: UUID) -> list[M.Transaksi]:
        res = await self.s.execute(
            select(M.Transaksi).where(M.Transaksi.pesanan_id == pesanan_id)
        )
        return list(res.scalars().all())

    async def daftar(
        self,
        desa_id: UUID,
        penyedia_tipe: str | None = None,
        penyedia_id: UUID | None = None,
        status: str | None = None,
        jenis: str | None = None,
        payout_id_null: bool = False,
    ) -> list[M.Transaksi]:
        q = select(M.Transaksi).where(M.Transaksi.desa_id == desa_id)
        if penyedia_tipe:
            q = q.where(M.Transaksi.penyedia_tipe == penyedia_tipe)
        if penyedia_id:
            q = q.where(M.Transaksi.penyedia_id == penyedia_id)
        if status:
            q = q.where(M.Transaksi.status == status)
        if jenis:
            q = q.where(M.Transaksi.jenis == jenis)
        if payout_id_null:
            q = q.where(M.Transaksi.payout_id.is_(None))
        res = await self.s.execute(q.order_by(M.Transaksi.dibuat_pada.desc()))
        return list(res.scalars().all())

    async def lepas_payout(self, payout_id: UUID, desa_id: UUID) -> None:
        await self.s.execute(
            update(M.Transaksi)
            .where(M.Transaksi.payout_id == payout_id, M.Transaksi.desa_id == desa_id)
            .values(payout_id=None)
        )
        await self.s.flush()


class RepoRekeningPenyediaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, r: M.RekeningPenyedia) -> M.RekeningPenyedia:
        self.s.add(r)
        await self.s.flush()
        return r

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.RekeningPenyedia]:
        row = await self.s.get(M.RekeningPenyedia, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.RekeningPenyedia:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Rekening tidak ditemukan.")
        return row

    async def daftar(
        self,
        desa_id: UUID,
        penyedia_tipe: str | None = None,
        penyedia_id: UUID | None = None,
    ) -> list[M.RekeningPenyedia]:
        q = select(M.RekeningPenyedia).where(M.RekeningPenyedia.desa_id == desa_id)
        if penyedia_tipe:
            q = q.where(M.RekeningPenyedia.penyedia_tipe == penyedia_tipe)
        if penyedia_id:
            q = q.where(M.RekeningPenyedia.penyedia_id == penyedia_id)
        res = await self.s.execute(q.order_by(M.RekeningPenyedia.dibuat_pada.desc()))
        return list(res.scalars().all())

    async def hapus(self, id: UUID, desa_id: UUID) -> None:
        row = await self.wajib(id, desa_id)
        await self.s.delete(row)
        await self.s.flush()


class RepoPayoutSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, p: M.Payout) -> M.Payout:
        self.s.add(p)
        await self.s.flush()
        return p

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.Payout]:
        row = await self.s.get(M.Payout, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.Payout:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Payout tidak ditemukan.")
        return row

    async def daftar(
        self,
        desa_id: UUID,
        penyedia_id: UUID | None = None,
        status: str | None = None,
    ) -> list[M.Payout]:
        q = select(M.Payout).where(M.Payout.desa_id == desa_id)
        if penyedia_id:
            q = q.where(M.Payout.penyedia_id == penyedia_id)
        if status:
            q = q.where(M.Payout.status == status)
        res = await self.s.execute(q.order_by(M.Payout.dibuat_pada.desc()))
        return list(res.scalars().all())


class RepoRefundSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, r: M.Refund) -> M.Refund:
        self.s.add(r)
        await self.s.flush()
        return r

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.Refund]:
        row = await self.s.get(M.Refund, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.Refund:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Refund tidak ditemukan.")
        return row

    async def daftar(
        self,
        desa_id: UUID,
        status: str | None = None,
        pemohon_id: UUID | None = None,
    ) -> list[M.Refund]:
        q = select(M.Refund).where(M.Refund.desa_id == desa_id)
        if status:
            q = q.where(M.Refund.status == status)
        if pemohon_id:
            q = q.where(M.Refund.pemohon_id == pemohon_id)
        res = await self.s.execute(q.order_by(M.Refund.dibuat_pada.desc()))
        return list(res.scalars().all())


class RepoWebhookPembayaranSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def sudah_ada(self, event_id: str) -> bool:
        res = await self.s.execute(
            select(M.WebhookPembayaran.id).where(M.WebhookPembayaran.event_id == event_id)
        )
        return res.scalar_one_or_none() is not None

    async def simpan(self, w: M.WebhookPembayaran) -> M.WebhookPembayaran:
        self.s.add(w)
        await self.s.flush()
        return w


class RepoKatalogHadiahSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, h: M.KatalogHadiah) -> M.KatalogHadiah:
        self.s.add(h)
        await self.s.flush()
        return h

    async def ambil(self, id: UUID, desa_id: UUID | None = None) -> Optional[M.KatalogHadiah]:
        row = await self.s.get(M.KatalogHadiah, id)
        if row is None:
            return None
        if desa_id is not None and row.desa_id is not None and row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.KatalogHadiah:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Hadiah tidak ditemukan.")
        return row

    async def daftar_aktif(self, desa_id: UUID) -> list[M.KatalogHadiah]:
        res = await self.s.execute(
            select(M.KatalogHadiah).where(
                M.KatalogHadiah.aktif.is_(True),
                (M.KatalogHadiah.desa_id == desa_id) | (M.KatalogHadiah.desa_id.is_(None)),
            )
        )
        return list(res.scalars().all())


class RepoKuponSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, k: M.Kupon) -> M.Kupon:
        self.s.add(k)
        await self.s.flush()
        return k

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.Kupon]:
        row = await self.s.get(M.Kupon, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.Kupon:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Kupon tidak ditemukan.")
        return row

    async def ambil_kode(self, kode: str, desa_id: UUID) -> Optional[M.Kupon]:
        res = await self.s.execute(
            select(M.Kupon).where(M.Kupon.kode == kode, M.Kupon.desa_id == desa_id)
        )
        return res.scalar_one_or_none()

    async def kunci(self, id: UUID, desa_id: UUID) -> M.Kupon:
        res = await self.s.execute(
            select(M.Kupon)
            .where(M.Kupon.id == id, M.Kupon.desa_id == desa_id)
            .with_for_update()
        )
        row = res.scalar_one_or_none()
        if row is None:
            raise TidakDitemukan("Kupon tidak ditemukan.")
        return row

    async def daftar_pengguna(self, desa_id: UUID, pengguna_id: UUID) -> list[M.Kupon]:
        res = await self.s.execute(
            select(M.Kupon).where(
                M.Kupon.desa_id == desa_id,
                M.Kupon.status == "aktif",
                (M.Kupon.pemilik_id == pengguna_id) | (M.Kupon.sumber == "kampanye"),
            )
        )
        return list(res.scalars().all())


class RepoPenukaranPoinSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, p: M.PenukaranPoin) -> M.PenukaranPoin:
        self.s.add(p)
        await self.s.flush()
        return p

    async def daftar(
        self, desa_id: UUID, pengguna_id: UUID | None = None,
    ) -> list[M.PenukaranPoin]:
        q = select(M.PenukaranPoin).where(M.PenukaranPoin.desa_id == desa_id)
        if pengguna_id:
            q = q.where(M.PenukaranPoin.pengguna_id == pengguna_id)
        res = await self.s.execute(q.order_by(M.PenukaranPoin.dibuat_pada.desc()))
        return list(res.scalars().all())


class RepoPemakaianKuponSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, pk: M.PemakaianKupon) -> M.PemakaianKupon:
        self.s.add(pk)
        await self.s.flush()
        return pk


async def _set_lokasi_stasiun(s: AsyncSession, stasiun_id: UUID, lat: float, lng: float) -> None:
    await s.execute(
        text(
            "UPDATE stasiun_lestari SET lokasi = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography "
            "WHERE id = :id"
        ),
        {"id": str(stasiun_id), "lat": lat, "lng": lng},
    )


async def _baca_koordinat_stasiun(s: AsyncSession, stasiun_id: UUID) -> tuple[float, float] | None:
    res = await s.execute(
        text(
            "SELECT ST_Y(lokasi::geometry) AS lat, ST_X(lokasi::geometry) AS lng "
            "FROM stasiun_lestari WHERE id = :id AND lokasi IS NOT NULL"
        ),
        {"id": str(stasiun_id)},
    )
    row = res.mappings().first()
    if row is None:
        return None
    return float(row["lat"]), float(row["lng"])


async def _dalam_geofence_stasiun(
    s: AsyncSession, stasiun_id: UUID, lat: float, lng: float, radius_m: int,
) -> bool:
    res = await s.execute(
        text(
            "SELECT ST_DWithin("
            "  (SELECT lokasi FROM stasiun_lestari WHERE id = :id),"
            "  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,"
            "  :radius"
            ")"
        ),
        {"id": str(stasiun_id), "lat": lat, "lng": lng, "radius": radius_m},
    )
    return bool(res.scalar())


async def _set_lokasi_stempel(s: AsyncSession, stempel_id: UUID, lat: float, lng: float) -> None:
    await s.execute(
        text(
            "UPDATE stempel SET lokasi = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography "
            "WHERE id = :id"
        ),
        {"id": str(stempel_id), "lat": lat, "lng": lng},
    )


def _qr_token() -> str:
    return "STN-" + secrets.token_urlsafe(12)


class RepoStasiunLestariSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, st: M.StasiunLestari, lat: float | None = None, lng: float | None = None) -> M.StasiunLestari:
        self.s.add(st)
        await self.s.flush()
        if lat is not None and lng is not None:
            await _set_lokasi_stasiun(self.s, st.id, lat, lng)
        return st

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.StasiunLestari]:
        row = await self.s.get(M.StasiunLestari, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.StasiunLestari:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Stasiun tidak ditemukan.")
        return row

    async def koordinat(self, id: UUID) -> tuple[float, float] | None:
        return await _baca_koordinat_stasiun(self.s, id)

    async def dalam_geofence(self, id: UUID, lat: float, lng: float, radius_m: int) -> bool:
        return await _dalam_geofence_stasiun(self.s, id, lat, lng, radius_m)

    async def daftar(
        self, desa_id: UUID, aktif_only: bool = True,
    ) -> list[M.StasiunLestari]:
        q = select(M.StasiunLestari).where(M.StasiunLestari.desa_id == desa_id)
        if aktif_only:
            q = q.where(M.StasiunLestari.aktif.is_(True))
        res = await self.s.execute(q.order_by(M.StasiunLestari.nama))
        return list(res.scalars().all())

    async def rotasi_qr(self, id: UUID, desa_id: UUID) -> M.StasiunLestari:
        row = await self.wajib(id, desa_id)
        row.qr_token = _qr_token()
        await self.s.flush()
        return row


class RepoMisiSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, m: M.Misi) -> M.Misi:
        self.s.add(m)
        await self.s.flush()
        return m

    async def ambil(self, id: UUID, desa_id: UUID | None = None) -> Optional[M.Misi]:
        row = await self.s.get(M.Misi, id)
        if row is None:
            return None
        if desa_id is not None and row.desa_id is not None and row.desa_id != desa_id:
            return None
        return row

    async def ambil_kode(self, kode: str, desa_id: UUID) -> Optional[M.Misi]:
        res = await self.s.execute(
            select(M.Misi).where(
                M.Misi.kode == kode,
                (M.Misi.desa_id == desa_id) | (M.Misi.desa_id.is_(None)),
            )
        )
        return res.scalar_one_or_none()

    async def wajib(self, id: UUID, desa_id: UUID) -> M.Misi:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Misi tidak ditemukan.")
        return row

    async def daftar(
        self,
        desa_id: UUID,
        jenis: str | None = None,
        kategori: str | None = None,
        stasiun_id: UUID | None = None,
        aktif_only: bool = True,
    ) -> list[M.Misi]:
        q = select(M.Misi).where(
            (M.Misi.desa_id == desa_id) | (M.Misi.desa_id.is_(None)),
        )
        if aktif_only:
            q = q.where(M.Misi.aktif.is_(True))
        if jenis:
            q = q.where(M.Misi.jenis == jenis)
        if kategori:
            q = q.where(M.Misi.kategori == kategori)
        if stasiun_id:
            q = q.where(M.Misi.stasiun_id == stasiun_id)
        res = await self.s.execute(q.order_by(M.Misi.judul))
        return list(res.scalars().all())


class RepoPasporLestariSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, p: M.PasporLestari) -> M.PasporLestari:
        self.s.add(p)
        await self.s.flush()
        return p

    async def ambil_pengguna(self, desa_id: UUID, pengguna_id: UUID) -> Optional[M.PasporLestari]:
        res = await self.s.execute(
            select(M.PasporLestari).where(
                M.PasporLestari.desa_id == desa_id,
                M.PasporLestari.pengguna_id == pengguna_id,
            )
        )
        return res.scalar_one_or_none()

    async def wajib(self, id: UUID, desa_id: UUID) -> M.PasporLestari:
        row = await self.s.get(M.PasporLestari, id)
        if row is None or row.desa_id != desa_id:
            raise TidakDitemukan("Paspor tidak ditemukan.")
        return row


class RepoStempelSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, st: M.Stempel, lat: float | None = None, lng: float | None = None) -> M.Stempel:
        self.s.add(st)
        await self.s.flush()
        if lat is not None and lng is not None:
            await _set_lokasi_stempel(self.s, st.id, lat, lng)
        return st

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.Stempel]:
        row = await self.s.get(M.Stempel, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.Stempel:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Stempel tidak ditemukan.")
        return row

    async def daftar_paspor(
        self, desa_id: UUID, paspor_id: UUID, status: str | None = None,
    ) -> list[M.Stempel]:
        q = select(M.Stempel).where(
            M.Stempel.desa_id == desa_id,
            M.Stempel.paspor_id == paspor_id,
        )
        if status:
            q = q.where(M.Stempel.status == status)
        res = await self.s.execute(q.order_by(M.Stempel.dibuat_pada.desc()))
        return list(res.scalars().all())

    async def daftar_pengguna(
        self, desa_id: UUID, paspor_id: UUID, status: str | None = None,
    ) -> list[M.Stempel]:
        return await self.daftar_paspor(desa_id, paspor_id, status)

    async def punya_belajar_terverifikasi(
        self, desa_id: UUID, paspor_id: UUID, kategori: str,
    ) -> bool:
        res = await self.s.execute(
            select(M.Stempel.id)
            .join(M.Misi, M.Stempel.misi_id == M.Misi.id)
            .where(
                M.Stempel.desa_id == desa_id,
                M.Stempel.paspor_id == paspor_id,
                M.Stempel.status == "terverifikasi",
                M.Misi.jenis == "belajar",
                M.Misi.kategori == kategori,
            )
            .limit(1)
        )
        return res.scalar_one_or_none() is not None


class RepoVerifikasiSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, v: M.Verifikasi) -> M.Verifikasi:
        self.s.add(v)
        await self.s.flush()
        return v

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.Verifikasi]:
        row = await self.s.get(M.Verifikasi, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.Verifikasi:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Verifikasi tidak ditemukan.")
        return row

    async def daftar(
        self,
        desa_id: UUID,
        entitas_tipe: str | None = None,
        hasil: str | None = None,
    ) -> list[M.Verifikasi]:
        q = select(M.Verifikasi).where(M.Verifikasi.desa_id == desa_id)
        if entitas_tipe:
            q = q.where(M.Verifikasi.entitas_tipe == entitas_tipe)
        if hasil:
            q = q.where(M.Verifikasi.hasil == hasil)
        res = await self.s.execute(q.order_by(M.Verifikasi.dibuat_pada.desc()))
        return list(res.scalars().all())


class RepoSesiPemanduSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, sesi: M.SesiPemandu) -> M.SesiPemandu:
        self.s.add(sesi)
        await self.s.flush()
        return sesi

    async def ambil(self, id: UUID, desa_id: UUID) -> Optional[M.SesiPemandu]:
        row = await self.s.get(M.SesiPemandu, id)
        if row is None or row.desa_id != desa_id:
            return None
        return row

    async def wajib(self, id: UUID, desa_id: UUID) -> M.SesiPemandu:
        row = await self.ambil(id, desa_id)
        if row is None:
            raise TidakDitemukan("Sesi pemandu tidak ditemukan.")
        return row


class RepoPercakapanPemanduSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, baris: M.PercakapanPemandu) -> M.PercakapanPemandu:
        self.s.add(baris)
        await self.s.flush()
        return baris

    async def daftar_sesi(self, sesi_id: UUID) -> list[M.PercakapanPemandu]:
        res = await self.s.execute(
            select(M.PercakapanPemandu)
            .where(M.PercakapanPemandu.sesi_id == sesi_id)
            .order_by(M.PercakapanPemandu.dibuat_pada)
        )
        return list(res.scalars().all())
