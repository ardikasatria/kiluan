"""Wishlist pengguna — simpanan destinasi/paket/misi (lintas-desa)."""
from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from app.domain import entitas as E
from app.domain.enums import EntitasLampiran, StatusDesa, StatusKonten
from app.domain.errors import KesalahanValidasi, TidakDitemukan
from app.domain.paginasi import keyset
from app.layanan.media import MediaLayanan
from app.repo.f2_sql import RepoMisiSQL

TIPE_VALID = frozenset({"destinasi", "paket", "misi", "produk"})


class SimpananLayanan:
    def __init__(self, store):
        self.store = store

    def _misi_repo(self):
        if hasattr(self.store, "misi"):
            return self.store.misi
        if hasattr(self.store, "sesi"):
            return RepoMisiSQL(self.store.sesi)
        return None

    async def _desa_aktif(self, desa_id: UUID):
        d = await self.store.desa.ambil(desa_id)
        if d is None or getattr(d, "status", None) != StatusDesa.aktif:
            raise TidakDitemukan("entitas tidak ditemukan")
        return d

    async def _validasi_entitas(self, tipe: str, entitas_id: UUID) -> tuple[UUID, dict[str, Any]]:
        if tipe not in TIPE_VALID:
            raise KesalahanValidasi("tipe simpanan tidak dikenal", [{"field": "tipe", "pesan": "tidak valid"}])

        if tipe == "destinasi":
            d = await self.store.destinasi.ambil(entitas_id)
            if d is None or getattr(d, "dihapus_pada", None) is not None:
                raise TidakDitemukan("entitas tidak ditemukan")
            if d.status != StatusKonten.publikasi:
                raise TidakDitemukan("entitas tidak ditemukan")
            await self._desa_aktif(d.desa_id)
            return d.desa_id, {
                "nama": d.nama,
                "slug": d.slug,
                "subjudul": d.alamat,
            }

        if tipe == "paket":
            p = await self.store.paket_wisata.ambil(entitas_id)
            if p is None or getattr(p, "dihapus_pada", None) is not None:
                raise TidakDitemukan("entitas tidak ditemukan")
            if getattr(p, "status", None) != "publikasi":
                raise TidakDitemukan("entitas tidak ditemukan")
            await self._desa_aktif(p.desa_id)
            return p.desa_id, {
                "nama": p.nama,
                "slug": p.slug,
                "subjudul": f"{p.durasi_jam} jam",
            }

        if tipe == "produk":
            p = await self.store.produk_jasa.ambil(entitas_id)
            if p is None or getattr(p, "dihapus_pada", None) is not None:
                raise TidakDitemukan("entitas tidak ditemukan")
            if p.status != "publikasi":
                raise TidakDitemukan("entitas tidak ditemukan")
            umkm = await self.store.umkm.ambil(p.umkm_id)
            if (
                umkm is None
                or getattr(umkm, "dihapus_pada", None) is not None
                or umkm.status_verifikasi != "terverifikasi"
            ):
                raise TidakDitemukan("entitas tidak ditemukan")
            await self._desa_aktif(p.desa_id)
            return p.desa_id, {
                "nama": p.nama,
                "slug": str(p.id),
                "subjudul": umkm.nama,
            }

        repo = self._misi_repo()
        if repo is None:
            raise KesalahanValidasi("modul misi belum tersedia", [{"field": "tipe", "pesan": "belum_tersedia"}])
        row = await repo.ambil(entitas_id, None)
        if row is None or not getattr(row, "aktif", False):
            raise TidakDitemukan("entitas tidak ditemukan")
        desa_id = row.desa_id
        if desa_id is None:
            raise TidakDitemukan("entitas tidak ditemukan")
        await self._desa_aktif(desa_id)
        return desa_id, {
            "nama": getattr(row, "judul", ""),
            "slug": getattr(row, "kode", str(entitas_id)),
            "subjudul": getattr(row, "kategori", None),
        }

    async def _meta_desa(self, desa_id: UUID) -> dict[str, str]:
        d = await self._desa_aktif(desa_id)
        return {"desa_id": str(desa_id), "desa_slug": d.slug, "desa_nama": d.nama}

    async def _sampul_url(self, tipe: str, entitas_id: UUID, desa_id: UUID) -> Optional[str]:
        if tipe not in ("destinasi", "produk"):
            return None
        ent_tipe = EntitasLampiran.destinasi if tipe == "destinasi" else EntitasLampiran.produk_jasa
        try:
            media = await MediaLayanan(self.store).daftar_entitas_publik(ent_tipe, entitas_id)
            if media:
                return media[0].get("url")
        except Exception:
            pass
        return None

    async def _serial_item(self, s: E.Simpanan) -> dict[str, Any]:
        desa_meta = await self._meta_desa(s.desa_id)
        ringkas: dict[str, Any] = {"nama": "", "slug": "", "subjudul": None, "gambar_url": None}
        try:
            _, ent = await self._validasi_entitas(s.tipe, s.entitas_id)
            ringkas.update(ent)
            ringkas["gambar_url"] = await self._sampul_url(s.tipe, s.entitas_id, s.desa_id)
        except TidakDitemukan:
            ringkas["nama"] = "(tidak tersedia)"
        return {
            "id": str(s.id),
            "tipe": s.tipe,
            "entitas_id": str(s.entitas_id),
            "catatan": s.catatan,
            "dibuat_pada": s.dibuat_pada.isoformat() if s.dibuat_pada else None,
            **desa_meta,
            "entitas": ringkas,
        }

    async def tambah(
        self,
        pengguna_id: UUID,
        tipe: str,
        entitas_id: UUID,
        catatan: Optional[str] = None,
    ) -> tuple[E.Simpanan, bool]:
        desa_id, _ = await self._validasi_entitas(tipe, entitas_id)
        return await self.store.simpanan.tambah_idempoten(
            E.Simpanan(
                pengguna_id=pengguna_id,
                desa_id=desa_id,
                tipe=tipe,
                entitas_id=entitas_id,
                catatan=catatan,
            )
        )

    async def daftar(
        self,
        pengguna_id: UUID,
        *,
        tipe: Optional[str] = None,
        batas: int = 20,
        kursor: Optional[str] = None,
    ) -> dict[str, Any]:
        if tipe and tipe not in TIPE_VALID:
            raise KesalahanValidasi("tipe filter tidak valid")
        rows = await self.store.simpanan.daftar_pengguna(pengguna_id, tipe=tipe)
        hal = keyset(rows, batas=batas, kursor=kursor)
        item = []
        for s in hal.item:
            item.append(await self._serial_item(s))
        return {
            "item": item,
            "meta": {
                "kursor_berikutnya": hal.kursor_berikutnya,
                "ada_lagi": hal.ada_lagi,
                "batas": hal.batas,
            },
        }

    async def ubah_catatan(self, pengguna_id: UUID, simpanan_id: UUID, catatan: Optional[str]) -> E.Simpanan:
        s = await self.store.simpanan.ambil(simpanan_id)
        if s is None or s.pengguna_id != pengguna_id:
            raise TidakDitemukan("simpanan tidak ditemukan")
        s.catatan = catatan
        return s

    async def hapus(self, pengguna_id: UUID, simpanan_id: UUID) -> None:
        s = await self.store.simpanan.ambil(simpanan_id)
        if s is None or s.pengguna_id != pengguna_id:
            raise TidakDitemukan("simpanan tidak ditemukan")
        await self.store.simpanan.hapus(simpanan_id)

    async def status(
        self,
        pengguna_id: UUID,
        tipe: str,
        entitas_ids: list[UUID],
    ) -> list[dict[str, Any]]:
        if tipe not in TIPE_VALID:
            raise KesalahanValidasi("tipe tidak valid")
        hasil = []
        for eid in entitas_ids:
            s = await self.store.simpanan.cari_entitas(pengguna_id, tipe, eid)
            hasil.append({
                "tipe": tipe,
                "entitas_id": str(eid),
                "disimpan": s is not None,
                "simpanan_id": str(s.id) if s else None,
            })
        return hasil
