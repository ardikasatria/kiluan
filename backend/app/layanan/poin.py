"""Kupon & tukar poin F2 (B11 SQL)."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.exc import IntegrityError

from app.domain.enums import KodePeran
from app.domain.errors import (
    IdempotencyKeyWajib,
    Konflik,
    KesalahanValidasi,
    KuponTidakBerlaku,
    SaldoPoinKurang,
    StokHabis,
    TidakBerwenang,
    TidakDitemukan,
)
from app.domain.konteks import Konteks
from app.inti.idempotensi import toko_idempotensi
from app.inti.outbox import Outbox
from app.model import tabel as M

BENDAHARA = frozenset({KodePeran.pokdarwis, KodePeran.perangkat_desa, KodePeran.admin})
URUTAN_TINGKAT = {"tunas": 1, "bahari": 2, "lumba_lumba": 3}


def _bulat(v: Decimal) -> Decimal:
    return v.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _pengelola(konteks: Konteks, desa_id: UUID) -> bool:
    return konteks.admin_global() or bool(konteks.peran_di(desa_id) & BENDAHARA)


class PoinLayanan:
    def __init__(self, store):
        self.store = store
        s = store.sesi
        from app.repo.f2_sql import (
            RepoKatalogHadiahSQL,
            RepoKuponSQL,
            RepoPemakaianKuponSQL,
            RepoPenukaranPoinSQL,
        )

        self.hadiah = RepoKatalogHadiahSQL(s)
        self.kupon = RepoKuponSQL(s)
        self.penukaran = RepoPenukaranPoinSQL(s)
        self.pemakaian = RepoPemakaianKuponSQL(s)
        self.outbox = Outbox(store)

    async def _tingkat_pengguna(self, desa_id: UUID, pengguna_id: UUID) -> str | None:
        best = 0
        best_name: str | None = None
        umkm_list = await self.store.umkm.cari(desa_id=desa_id, pengguna_id=pengguna_id)
        for umkm in umkm_list:
            for s in await self.store.sertifikasi_owner.cari(
                desa_id=desa_id, subjek_tipe="umkm", subjek_id=umkm.id,
            ):
                lvl = URUTAN_TINGKAT.get(s.tingkat, 0)
                if lvl > best:
                    best = lvl
                    best_name = s.tingkat
        return best_name

    async def validasi_kupon(
        self, kupon: M.Kupon, subtotal: Decimal, penyedia: set[str],
    ) -> None:
        now = _now()
        if kupon.status != "aktif":
            raise KuponTidakBerlaku("Kupon tidak aktif.")
        if kupon.berlaku_mulai and now < kupon.berlaku_mulai:
            raise KuponTidakBerlaku("Belum berlaku.")
        if kupon.berlaku_sampai and now > kupon.berlaku_sampai:
            raise KuponTidakBerlaku("Kupon kedaluwarsa.")
        if kupon.terpakai >= kupon.batas_pakai:
            raise KuponTidakBerlaku("Batas pakai tercapai.")
        if kupon.min_belanja is not None and subtotal < kupon.min_belanja:
            raise KuponTidakBerlaku("Min belanja belum terpenuhi.")
        if kupon.penyedia_terbatas:
            allowed = set(kupon.penyedia_terbatas)
            cocok = bool(penyedia.intersection(allowed))
            batas_tingkat = [
                item.split(":", 1)[1]
                for item in allowed
                if item.startswith("tingkat:") and ":" in item
            ]
            if not cocok and batas_tingkat:
                tingkat_min = max((URUTAN_TINGKAT.get(item, 0) for item in batas_tingkat), default=0)
                for ref in penyedia:
                    if not ref.startswith("umkm:"):
                        continue
                    try:
                        umkm_id = UUID(ref.split(":", 1)[1])
                    except (ValueError, IndexError):
                        continue
                    sertifikasi = await self.store.sertifikasi_owner.cari(
                        desa_id=kupon.desa_id, subjek_tipe="umkm", subjek_id=umkm_id,
                    )
                    if any(URUTAN_TINGKAT.get(item.tingkat, 0) >= tingkat_min for item in sertifikasi):
                        cocok = True
                        break
            if not cocok:
                raise KuponTidakBerlaku("Penyedia di luar cakupan kupon.")

    def hitung_diskon(self, kupon: M.Kupon, subtotal: Decimal) -> Decimal:
        if kupon.tipe_diskon == "persen":
            diskon = _bulat(subtotal * kupon.nilai / Decimal(100))
        else:
            diskon = _bulat(kupon.nilai)
        return min(diskon, subtotal)

    async def cek_kupon(
        self, desa_id: UUID, kode: str, subtotal: Decimal, penyedia: set[str],
    ) -> dict[str, Any]:
        kupon = await self.kupon.ambil_kode(kode, desa_id)
        if kupon is None:
            raise TidakDitemukan("Kupon tak ada.")
        await self.validasi_kupon(kupon, subtotal, penyedia)
        return {
            "berlaku": True,
            "diskon": self.hitung_diskon(kupon, subtotal),
            "kupon_id": str(kupon.id),
            "kode": kupon.kode,
        }

    async def terapkan_kupon(
        self,
        kupon: M.Kupon,
        pesanan_id: UUID,
        pengguna_id: UUID,
        subtotal: Decimal,
        penyedia: set[str],
    ) -> Decimal:
        kupon = await self.kupon.kunci(kupon.id, kupon.desa_id)
        await self.validasi_kupon(kupon, subtotal, penyedia)
        diskon = self.hitung_diskon(kupon, subtotal)
        try:
            await self.pemakaian.simpan(M.PemakaianKupon(
                id=uuid4(),
                kupon_id=kupon.id,
                pesanan_id=pesanan_id,
                pengguna_id=pengguna_id,
                jumlah_diskon=diskon,
                dibuat_pada=_now(),
            ))
        except IntegrityError as exc:
            raise Konflik("Kupon sudah dipakai pada pesanan ini.") from exc
        kupon.terpakai += 1
        if kupon.terpakai >= kupon.batas_pakai:
            kupon.status = "habis"
        return diskon

    async def daftar_hadiah(self, desa_id: UUID) -> list[M.KatalogHadiah]:
        return await self.hadiah.daftar_aktif(desa_id)

    async def buat_hadiah(self, konteks: Konteks, desa_id: UUID, data: dict) -> M.KatalogHadiah:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        h = M.KatalogHadiah(
            id=uuid4(),
            desa_id=desa_id,
            kode=data.get("kode") or f"H-{secrets.token_hex(3).upper()}",
            nama=data["nama"],
            deskripsi=data.get("deskripsi"),
            jenis=data["jenis"],
            biaya_poin=int(data["biaya_poin"]),
            stok=data.get("stok"),
            syarat=data.get("syarat") or {},
            aktif=data.get("aktif", True),
        )
        return await self.hadiah.simpan(h)

    async def ubah_hadiah(
        self, konteks: Konteks, desa_id: UUID, hadiah_id: UUID, ubah: dict,
    ) -> M.KatalogHadiah:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        h = await self.hadiah.wajib(hadiah_id, desa_id)
        for k in ("nama", "deskripsi", "stok", "syarat", "aktif", "biaya_poin"):
            if k in ubah and ubah[k] is not None:
                setattr(h, k, ubah[k])
        return h

    async def tukar(
        self,
        konteks: Konteks,
        desa_id: UUID,
        hadiah_id: UUID,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        if konteks.pengguna_id is None:
            raise TidakBerwenang()
        toko_idempotensi.wajib_key(idempotency_key)
        ep = f"tukar:{hadiah_id}"
        cache = toko_idempotensi.ambil(idempotency_key, str(konteks.pengguna_id), ep)
        if cache is not None:
            return cache

        hadiah = await self.hadiah.wajib(hadiah_id, desa_id)
        if not hadiah.aktif:
            raise TidakDitemukan("Hadiah tak tersedia.")

        tingkat_min = (hadiah.syarat or {}).get("tingkat_min")
        if tingkat_min:
            tingkat = await self._tingkat_pengguna(desa_id, konteks.pengguna_id)
            if not tingkat or URUTAN_TINGKAT.get(tingkat, 0) < URUTAN_TINGKAT.get(tingkat_min, 99):
                raise KesalahanValidasi("Tingkat owner belum memenuhi syarat.")

        saldo = await self.store.transaksi_poin.saldo_dengan_kunci(desa_id, konteks.pengguna_id)
        if saldo < hadiah.biaya_poin:
            raise SaldoPoinKurang()
        if hadiah.stok is not None and hadiah.stok <= 0:
            raise StokHabis()

        pen = M.PenukaranPoin(
            id=uuid4(),
            desa_id=desa_id,
            pengguna_id=konteks.pengguna_id,
            hadiah_id=hadiah.id,
            poin_dipakai=hadiah.biaya_poin,
            dibuat_pada=_now(),
        )
        await self.penukaran.simpan(pen)
        await self.store.transaksi_poin.debit_tukar_hadiah(
            desa_id, konteks.pengguna_id, -hadiah.biaya_poin, pen.id,
        )
        if hadiah.stok is not None:
            hadiah.stok -= 1

        kupon_baru: M.Kupon | None = None
        if hadiah.jenis == "kupon_diskon":
            kupon_baru = M.Kupon(
                id=uuid4(),
                desa_id=desa_id,
                kode="TUKAR-" + secrets.token_hex(3).upper(),
                pemilik_id=konteks.pengguna_id,
                sumber="tukar_poin",
                tipe_diskon="persen",
                nilai=Decimal(10),
                batas_pakai=1,
                dibuat_pada=_now(),
            )
            await self.kupon.simpan(kupon_baru)
            pen.kupon_id = kupon_baru.id

        hasil = {"penukaran": pen, "kupon": kupon_baru}
        await self.outbox.emit(
            desa_id,
            "tukar_poin_berhasil",
            "penukaran_poin",
            pen.id,
            {
                "pengguna_id": str(konteks.pengguna_id),
                "hadiah_id": str(hadiah.id),
                "poin_dipakai": hadiah.biaya_poin,
            },
        )
        return toko_idempotensi.simpan(idempotency_key, str(konteks.pengguna_id), ep, hasil)

    async def daftar_penukaran(
        self, konteks: Konteks, desa_id: UUID,
    ) -> list[M.PenukaranPoin]:
        if konteks.pengguna_id is None:
            raise TidakBerwenang()
        return await self.penukaran.daftar(desa_id, konteks.pengguna_id)

    async def daftar_kupon_saya(
        self, konteks: Konteks, desa_id: UUID,
    ) -> list[M.Kupon]:
        if konteks.pengguna_id is None:
            raise TidakBerwenang()
        return await self.kupon.daftar_pengguna(desa_id, konteks.pengguna_id)

    async def buat_kupon(
        self, konteks: Konteks, desa_id: UUID, data: dict,
    ) -> M.Kupon:
        sumber = data.get("sumber", "kampanye")
        if sumber == "kampanye" and not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        if sumber == "promo_owner":
            if konteks.pengguna_id is None:
                raise TidakBerwenang()
            umkm = await self.store.umkm.cari(
                desa_id=desa_id, pengguna_id=konteks.pengguna_id,
            )
            if not umkm:
                raise TidakBerwenang()
        k = M.Kupon(
            id=uuid4(),
            desa_id=desa_id,
            kode=data["kode"],
            pemilik_id=konteks.pengguna_id if sumber == "promo_owner" else data.get("pemilik_id"),
            sumber=sumber,
            tipe_diskon=data.get("tipe_diskon", "nominal"),
            nilai=Decimal(str(data["nilai"])),
            min_belanja=Decimal(str(data["min_belanja"])) if data.get("min_belanja") else None,
            batas_pakai=int(data.get("batas_pakai", 100)),
            penyedia_terbatas=data.get("penyedia_terbatas"),
            berlaku_mulai=data.get("berlaku_mulai"),
            berlaku_sampai=data.get("berlaku_sampai"),
            dibuat_pada=_now(),
        )
        return await self.kupon.simpan(k)
