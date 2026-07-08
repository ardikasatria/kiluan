"""Pasar Desa (KONTRAK §3): UMKM, produk/jasa, paket wisata + itinerary + state machine."""
from __future__ import annotations

from uuid import UUID

from .. import enums, mesin_status
from ..errors import Konflik, TidakBerwenang, TidakDitemukan, ValidasiGagal
from ..ids import sekarang
from ..konteks import Aktor, wajib_peran, wajib_pengelola
from ..models import KurasiLog, PaketItem, PaketWisata, ProdukJasa, Umkm
from ..repositori import RepoMemori, keyset


def _hidup(e, desa_id: UUID):
    """404 untuk lintas-tenant / soft-deleted (KONTRAK §1)."""
    if e is None or e.desa_id != desa_id or getattr(e, "dihapus_pada", None) is not None:
        raise TidakDitemukan("Resource tak ditemukan.")
    return e


class UmkmService:
    def __init__(self, repo: RepoMemori):
        self.repo = repo

    async def daftar(self, aktor: Aktor, desa_id: UUID, data: dict) -> Umkm:
        wajib_peran(aktor, desa_id, "umkm")  # pemohon wajib berperan umkm
        umkm = Umkm(
            desa_id=desa_id, pengguna_id=aktor.pengguna_id,
            bidang_id=data["bidang_id"], nama=data["nama"],
            deskripsi=data.get("deskripsi", ""), telepon=data.get("telepon", ""),
            whatsapp=data.get("whatsapp", ""), alamat=data.get("alamat", ""),
            lokasi=data.get("lokasi"),
        )
        return await self.repo.simpan(umkm)

    async def ambil_kelola(self, aktor: Aktor, desa_id: UUID, umkm_id: UUID) -> Umkm:
        umkm = _hidup(await self.repo.ambil(umkm_id), desa_id)
        if not (aktor.pengelola(desa_id) or umkm.pengguna_id == aktor.pengguna_id):
            raise TidakBerwenang("Hanya pemilik UMKM atau pengelola.")
        return umkm

    async def verifikasi(self, aktor: Aktor, desa_id: UUID, umkm_id: UUID, keputusan: str) -> Umkm:
        wajib_pengelola(aktor, desa_id)
        enums.wajib_enum(keputusan, frozenset({"terverifikasi", "ditolak"}), "keputusan")
        umkm = _hidup(await self.repo.ambil(umkm_id), desa_id)
        umkm.status_verifikasi = keputusan
        umkm.diverifikasi_oleh = aktor.pengguna_id
        umkm.diperbarui_pada = sekarang()
        return await self.repo.simpan(umkm)

    async def hapus(self, aktor: Aktor, desa_id: UUID, umkm_id: UUID) -> None:
        umkm = await self.ambil_kelola(aktor, desa_id, umkm_id)
        umkm.dihapus_pada = sekarang()
        await self.repo.simpan(umkm)

    async def daftar_publik(self, desa_id: UUID, kursor=None, batas=20):
        rows = [u for u in await self.repo.cari(desa_id=desa_id)
                if u.dihapus_pada is None and u.status_verifikasi == "terverifikasi"]
        return keyset(rows, kursor, batas)


class ProdukService:
    def __init__(self, repo: RepoMemori, umkm_service: UmkmService, poin_service):
        self.repo = repo
        self.umkm = umkm_service
        self.poin = poin_service

    async def buat(self, aktor: Aktor, desa_id: UUID, data: dict) -> ProdukJasa:
        umkm = await self.umkm.ambil_kelola(aktor, desa_id, data["umkm_id"])
        jenis = enums.wajib_enum(data["jenis"], enums.PRODUK_JENIS, "jenis")
        enums.wajib_enum(data["satuan_harga"], enums.SATUAN_HARGA, "satuan_harga")
        produk = ProdukJasa(
            desa_id=desa_id, umkm_id=umkm.id, nama=data["nama"], jenis=jenis,
            harga=data["harga"], satuan_harga=data["satuan_harga"],
            deskripsi=data.get("deskripsi", ""),
            stok=None if jenis == "jasa" else data.get("stok"),
        )
        await self.repo.simpan(produk)
        # award produk_terdaftar ke pemilik UMKM (idempoten via referensi)
        await self.poin.award(desa_id, umkm.pengguna_id, "produk_terdaftar",
                              "produk_jasa", produk.id)
        return produk

    async def _ambil(self, desa_id: UUID, produk_id: UUID) -> ProdukJasa:
        return _hidup(await self.repo.ambil(produk_id), desa_id)

    async def ubah_status(self, aktor: Aktor, desa_id: UUID, produk_id: UUID, status: str) -> ProdukJasa:
        status = enums.wajib_enum(status, enums.PRODUK_STATUS, "status")
        produk = await self._ambil(desa_id, produk_id)
        # cek kepemilikan via UMKM
        await self.umkm.ambil_kelola(aktor, desa_id, produk.umkm_id)
        if status == "publikasi":
            umkm = await self.umkm.repo.ambil(produk.umkm_id)
            if umkm.status_verifikasi != "terverifikasi":
                raise ValidasiGagal(
                    "UMKM belum terverifikasi; produk tak boleh dipublikasi.",
                    rincian=[{"field": "status", "pesan": "umkm_belum_terverifikasi"}],
                )
        produk.status = status
        produk.diperbarui_pada = sekarang()
        return await self.repo.simpan(produk)

    async def daftar_publik(self, desa_id: UUID, kursor=None, batas=20):
        umkm_map = {u.id: u for u in await self.umkm.repo.cari(desa_id=desa_id)}
        rows = [
            p for p in await self.repo.cari(desa_id=desa_id)
            if p.dihapus_pada is None and p.status == "publikasi"
            and (u := umkm_map.get(p.umkm_id)) is not None
            and u.dihapus_pada is None and u.status_verifikasi == "terverifikasi"
        ]
        return keyset(rows, kursor, batas)


class PaketService:
    def __init__(self, repo: RepoMemori, repo_item: RepoMemori,
                 repo_log: RepoMemori, poin_service):
        self.repo = repo
        self.item = repo_item
        self.log = repo_log
        self.poin = poin_service

    async def buat(self, aktor: Aktor, desa_id: UUID, data: dict) -> PaketWisata:
        wajib_peran(aktor, desa_id, "agen")
        enums.wajib_enum(data["satuan_harga"], enums.SATUAN_HARGA, "satuan_harga")
        bentrok = [p for p in await self.repo.cari(desa_id=desa_id, slug=data["slug"])
                   if p.dihapus_pada is None]
        if bentrok:
            raise Konflik("Slug paket sudah dipakai di desa ini.")
        paket = PaketWisata(
            desa_id=desa_id, agen_id=aktor.pengguna_id, slug=data["slug"],
            nama=data["nama"], durasi_jam=data["durasi_jam"], harga=data["harga"],
            satuan_harga=data["satuan_harga"], deskripsi=data.get("deskripsi", ""),
            kuota_default=data.get("kuota_default", 0),
        )
        return await self.repo.simpan(paket)

    async def _ambil(self, desa_id: UUID, paket_id: UUID) -> PaketWisata:
        return _hidup(await self.repo.ambil(paket_id), desa_id)

    async def tambah_item(self, aktor: Aktor, desa_id: UUID, paket_id: UUID, data: dict) -> PaketItem:
        paket = await self._ambil(desa_id, paket_id)
        if not (aktor.pengelola(desa_id) or paket.agen_id == aktor.pengguna_id):
            raise TidakBerwenang("Hanya agen pemilik atau pengelola.")
        ref = data.get("destinasi_id") or data.get("layanan_id") or data.get("produk_jasa_id")
        if not ref and not data.get("judul"):
            raise ValidasiGagal(
                "Item harus punya minimal satu referensi atau judul.",
                rincian=[{"field": "judul", "pesan": "referensi_atau_judul_wajib"}],
            )
        item = PaketItem(
            paket_id=paket_id, hari=data["hari"], urutan=data["urutan"],
            judul=data.get("judul", ""), deskripsi=data.get("deskripsi", ""),
            destinasi_id=data.get("destinasi_id"), layanan_id=data.get("layanan_id"),
            produk_jasa_id=data.get("produk_jasa_id"), durasi_menit=data.get("durasi_menit", 0),
        )
        return await self.item.simpan(item)

    async def transisi(self, aktor: Aktor, desa_id: UUID, paket_id: UUID,
                       aksi: str, catatan: str = "") -> PaketWisata:
        paket = await self._ambil(desa_id, paket_id)
        # guard peran per aksi (KONTRAK §6.1)
        if aksi == "ajukan":
            if paket.agen_id != aktor.pengguna_id and not aktor.pengelola(desa_id):
                raise TidakBerwenang("Hanya agen pemilik boleh mengajukan.")
        elif aksi in ("setuju", "tolak", "minta_revisi"):
            wajib_pengelola(aktor, desa_id)
        elif aksi == "arsip":
            if paket.agen_id != aktor.pengguna_id and not aktor.pengelola(desa_id):
                raise TidakBerwenang("Hanya pemilik atau pengelola boleh mengarsip.")
        dari = paket.status
        ke = mesin_status.transisi("paket_wisata", dari, aksi)
        paket.status = ke
        paket.diperbarui_pada = sekarang()
        await self.repo.simpan(paket)
        if mesin_status.tulis_log("paket_wisata", aksi):
            await self.log.simpan(KurasiLog(
                entitas_tipe="paket_wisata", entitas_id=paket.id, dari_status=dari,
                ke_status=ke, kurator_id=aktor.pengguna_id, keputusan=aksi, catatan=catatan,
            ))
        if ke == "publikasi":
            await self.poin.award(desa_id, paket.agen_id, "paket_dipublikasi",
                                  "paket_wisata", paket.id)
        return paket
