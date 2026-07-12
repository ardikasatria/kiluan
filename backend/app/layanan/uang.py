"""Escrow settlement — payout, refund, rekening penyedia (B10 SQL)."""
from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from app.domain.enums import KodePeran
from app.domain.errors import (
    IdempotencyKeyWajib,
    KebijakanRefund,
    KesalahanValidasi,
    TidakBerwenang,
    TransisiIlegalF2,
)
from app.domain.konteks import Konteks
from app.inti.idempotensi import toko_idempotensi
from app.inti.outbox import Outbox
from app.model import tabel as M
from app.repo.f2_sql import (
    RepoPayoutSQL,
    RepoPengaturanDesaSQL,
    RepoPesananSQL,
    RepoRekeningPenyediaSQL,
    RepoRefundSQL,
    RepoTransaksiSQL,
    _now,
)

BENDAHARA = frozenset({KodePeran.pokdarwis, KodePeran.perangkat_desa, KodePeran.admin})


def _pengelola(konteks: Konteks, desa_id: UUID) -> bool:
    return konteks.admin_global() or bool(konteks.peran_di(desa_id) & BENDAHARA)


class UangLayanan:
    def __init__(self, store):
        self.store = store
        s = store.sesi
        self.pengaturan = RepoPengaturanDesaSQL(s)
        self.pesanan = RepoPesananSQL(s)
        self.transaksi = RepoTransaksiSQL(s)
        self.rekening = RepoRekeningPenyediaSQL(s)
        self.payout = RepoPayoutSQL(s)
        self.refund = RepoRefundSQL(s)
        self.outbox = Outbox(store)

    async def _cek_pemilik_penyedia(
        self, konteks: Konteks, desa_id: UUID, penyedia_tipe: str, penyedia_id: UUID,
    ) -> None:
        if _pengelola(konteks, desa_id):
            return
        if konteks.pengguna_id is None:
            raise TidakBerwenang()
        if penyedia_tipe == "umkm":
            umkm = await self.store.umkm.ambil(penyedia_id)
            if umkm and umkm.desa_id == desa_id and umkm.pengguna_id == konteks.pengguna_id:
                return
        if penyedia_tipe == "pengguna" and konteks.pengguna_id == penyedia_id:
            return
        raise TidakBerwenang()

    async def daftar_transaksi(
        self,
        konteks: Konteks,
        desa_id: UUID,
        penyedia_tipe: str | None = None,
        penyedia_id: UUID | None = None,
        status: str | None = None,
    ) -> list[M.Transaksi]:
        if _pengelola(konteks, desa_id):
            return await self.transaksi.daftar(
                desa_id, penyedia_tipe=penyedia_tipe, penyedia_id=penyedia_id, status=status,
            )
        if penyedia_tipe and penyedia_id:
            await self._cek_pemilik_penyedia(konteks, desa_id, penyedia_tipe, penyedia_id)
            return await self.transaksi.daftar(
                desa_id, penyedia_tipe=penyedia_tipe, penyedia_id=penyedia_id, status=status,
            )
        raise TidakBerwenang()

    async def daftar_rekening(
        self,
        konteks: Konteks,
        desa_id: UUID,
        penyedia_tipe: str | None = None,
        penyedia_id: UUID | None = None,
    ) -> list[M.RekeningPenyedia]:
        if _pengelola(konteks, desa_id):
            return await self.rekening.daftar(desa_id, penyedia_tipe, penyedia_id)
        if penyedia_tipe and penyedia_id:
            await self._cek_pemilik_penyedia(konteks, desa_id, penyedia_tipe, penyedia_id)
            return await self.rekening.daftar(desa_id, penyedia_tipe, penyedia_id)
        raise TidakBerwenang()

    async def buat_rekening(self, konteks: Konteks, desa_id: UUID, data: dict) -> M.RekeningPenyedia:
        ptipe = data["penyedia_tipe"]
        pid = UUID(data["penyedia_id"])
        await self._cek_pemilik_penyedia(konteks, desa_id, ptipe, pid)
        rek = M.RekeningPenyedia(
            id=uuid4(),
            desa_id=desa_id,
            penyedia_tipe=ptipe,
            penyedia_id=pid,
            jenis=data["jenis"],
            bank_kode=data.get("bank_kode"),
            nomor=data["nomor"],
            nama_pemilik=data["nama_pemilik"],
            terverifikasi=False,
            utama=data.get("utama", True),
            dibuat_pada=_now(),
        )
        return await self.rekening.simpan(rek)

    async def ubah_rekening(
        self, konteks: Konteks, desa_id: UUID, rekening_id: UUID, ubah: dict,
    ) -> M.RekeningPenyedia:
        rek = await self.rekening.wajib(rekening_id, desa_id)
        await self._cek_pemilik_penyedia(konteks, desa_id, rek.penyedia_tipe, rek.penyedia_id)
        if "utama" in ubah:
            rek.utama = bool(ubah["utama"])
        if "nama_pemilik" in ubah:
            rek.nama_pemilik = ubah["nama_pemilik"]
        return rek

    async def verifikasi_rekening(
        self, konteks: Konteks, desa_id: UUID, rekening_id: UUID, terverifikasi: bool,
    ) -> M.RekeningPenyedia:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang("Hanya bendahara/pengelola.")
        rek = await self.rekening.wajib(rekening_id, desa_id)
        rek.terverifikasi = terverifikasi
        return rek

    async def hapus_rekening(
        self, konteks: Konteks, desa_id: UUID, rekening_id: UUID,
    ) -> None:
        rek = await self.rekening.wajib(rekening_id, desa_id)
        await self._cek_pemilik_penyedia(konteks, desa_id, rek.penyedia_tipe, rek.penyedia_id)
        await self.rekening.hapus(rekening_id, desa_id)

    async def buat_payout(
        self,
        konteks: Konteks,
        desa_id: UUID,
        penyedia_tipe: str,
        penyedia_id: UUID,
        rekening_id: UUID,
        metode: str = "manual",
        idempotency_key: str | None = None,
    ) -> M.Payout:
        toko_idempotensi.wajib_key(idempotency_key)
        ep = f"payout:{desa_id}:{penyedia_tipe}:{penyedia_id}"
        cache = toko_idempotensi.ambil(idempotency_key, str(konteks.pengguna_id), ep)
        if cache is not None:
            return cache
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang("Hanya bendahara/pengelola.")
        rek = await self.rekening.wajib(rekening_id, desa_id)
        if not rek.terverifikasi:
            raise KesalahanValidasi("Rekening belum terverifikasi.")
        kandidat = await self.transaksi.daftar(
            desa_id,
            penyedia_tipe=penyedia_tipe,
            penyedia_id=penyedia_id,
            status="dirilis",
            jenis="penjualan",
            payout_id_null=True,
        )
        if not kandidat:
            raise KesalahanValidasi("Tak ada transaksi untuk dipayout.")
        jumlah = sum((t.neto_penyedia for t in kandidat), Decimal(0))
        payout = M.Payout(
            id=uuid4(),
            desa_id=desa_id,
            penyedia_tipe=penyedia_tipe,
            penyedia_id=penyedia_id,
            rekening_id=rekening_id,
            jumlah=jumlah,
            metode=metode,
            status="antri",
            dibuat_pada=_now(),
        )
        await self.payout.simpan(payout)
        for t in kandidat:
            t.payout_id = payout.id
        await self.outbox.emit(
            desa_id,
            "payout_dibuat",
            "payout",
            payout.id,
            {
                "penyedia_id": str(penyedia_id),
                "penyedia_tipe": penyedia_tipe,
                "jumlah": str(jumlah),
            },
        )
        return toko_idempotensi.simpan(idempotency_key, str(konteks.pengguna_id), ep, payout)

    async def transisi_payout(
        self, konteks: Konteks, desa_id: UUID, payout_id: UUID, aksi: str,
    ) -> M.Payout:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        payout = await self.payout.wajib(payout_id, desa_id)
        if aksi == "tandai_berhasil":
            payout.status = "berhasil"
            payout.diproses_pada = _now()
            await self.outbox.emit(
                desa_id,
                "payout_berhasil",
                "payout",
                payout.id,
                {
                    "penyedia_id": str(payout.penyedia_id),
                    "penyedia_tipe": payout.penyedia_tipe,
                    "jumlah": str(payout.jumlah),
                },
            )
        elif aksi == "tandai_gagal":
            payout.status = "gagal"
            await self.transaksi.lepas_payout(payout_id, desa_id)
        else:
            raise TransisiIlegalF2(f"Aksi {aksi} tak sah.")
        return payout

    async def daftar_payout(
        self,
        konteks: Konteks,
        desa_id: UUID,
        penyedia_id: UUID | None = None,
        status: str | None = None,
    ) -> list[M.Payout]:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        return await self.payout.daftar(desa_id, penyedia_id=penyedia_id, status=status)

    async def ajukan_refund(
        self,
        konteks: Konteks,
        desa_id: UUID,
        pesanan_id: UUID,
        alasan: str,
        jumlah: Decimal | None = None,
        pesanan_item_id: UUID | None = None,
        idempotency_key: str | None = None,
    ) -> M.Refund:
        toko_idempotensi.wajib_key(idempotency_key)
        ep = f"refund:{pesanan_id}"
        cache = toko_idempotensi.ambil(idempotency_key, str(konteks.pengguna_id), ep)
        if cache is not None:
            return cache
        pesanan = await self.pesanan.wajib(pesanan_id, desa_id)
        if konteks.pengguna_id != pesanan.pembeli_id and not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        r = M.Refund(
            id=uuid4(),
            desa_id=desa_id,
            pesanan_id=pesanan_id,
            pemohon_id=konteks.pengguna_id,
            alasan=alasan,
            jumlah=jumlah if jumlah is not None else pesanan.total,
            pesanan_item_id=pesanan_item_id,
            dibuat_pada=_now(),
        )
        await self.refund.simpan(r)
        await self.outbox.emit(
            desa_id,
            "refund_diajukan",
            "refund",
            r.id,
            {
                "pembeli_id": str(pesanan.pembeli_id),
                "pesanan_id": str(pesanan.id),
                "jumlah": str(r.jumlah),
            },
        )
        return toko_idempotensi.simpan(idempotency_key, str(konteks.pengguna_id), ep, r)

    async def daftar_refund(
        self,
        konteks: Konteks,
        desa_id: UUID,
        status: str | None = None,
        milik_saya: bool = False,
    ) -> list[M.Refund]:
        pemohon = konteks.pengguna_id if milik_saya else None
        if milik_saya:
            if konteks.pengguna_id is None:
                raise TidakBerwenang()
            return await self.refund.daftar(desa_id, status=status, pemohon_id=pemohon)
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        return await self.refund.daftar(desa_id, status=status)

    async def ambil_refund(
        self, konteks: Konteks, desa_id: UUID, refund_id: UUID,
    ) -> M.Refund:
        r = await self.refund.wajib(refund_id, desa_id)
        if r.pemohon_id != konteks.pengguna_id and not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        return r

    async def transisi_refund(
        self, konteks: Konteks, desa_id: UUID, refund_id: UUID, aksi: str,
    ) -> M.Refund:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        r = await self.refund.wajib(refund_id, desa_id)
        pesanan = await self.pesanan.wajib(r.pesanan_id, desa_id)
        alur = {
            "setuju": ("diajukan", "disetujui"),
            "tolak": ("diajukan", "ditolak"),
            "proses": ("disetujui", "diproses"),
            "selesai": ("diproses", "selesai"),
        }
        if aksi not in alur:
            raise TransisiIlegalF2(f"Aksi {aksi} tak sah.")
        dari, ke = alur[aksi]
        if r.status != dari:
            raise TransisiIlegalF2(f"{r.status} → {ke} tak sah.")
        if aksi == "proses":
            if pesanan.status == "selesai":
                raise KebijakanRefund()
            for t in await self.transaksi.daftar_pesanan(r.pesanan_id):
                if t.jenis == "penjualan":
                    await self.transaksi.simpan(M.Transaksi(
                        id=uuid4(),
                        desa_id=desa_id,
                        pesanan_id=r.pesanan_id,
                        pembayaran_id=t.pembayaran_id,
                        penyedia_tipe=t.penyedia_tipe,
                        penyedia_id=t.penyedia_id,
                        jenis="refund",
                        bruto=-t.bruto,
                        fee_platform=-t.fee_platform,
                        porsi_reinvestasi=-t.porsi_reinvestasi,
                        neto_penyedia=-t.neto_penyedia,
                        status="direfund",
                        dibuat_pada=_now(),
                    ))
                    t.status = "direfund"
            pesanan.status = "refund"
        r.status = ke
        if ke == "selesai":
            r.selesai_pada = _now()
            await self.outbox.emit(
                desa_id,
                "refund_selesai",
                "refund",
                r.id,
                {"pembeli_id": str(pesanan.pembeli_id), "pesanan_id": str(pesanan.id)},
            )
        return r

    async def baca_pengaturan(self, desa_id: UUID) -> M.PengaturanDesa:
        return await self.pengaturan.wajib(desa_id)

    async def ubah_pengaturan(
        self, konteks: Konteks, desa_id: UUID, ubah: dict[str, Any],
    ) -> M.PengaturanDesa:
        if not _pengelola(konteks, desa_id):
            raise TidakBerwenang()
        p = await self.pengaturan.wajib(desa_id)
        for k in ("persen_reinvestasi", "persen_fee_platform", "batas_hold_menit", "gateway"):
            if k in ubah and ubah[k] is not None:
                setattr(p, k, ubah[k])
        if "kebijakan_pembatalan" in ubah:
            p.kebijakan_pembatalan = ubah["kebijakan_pembatalan"]
        p.diperbarui_pada = _now()
        return p
