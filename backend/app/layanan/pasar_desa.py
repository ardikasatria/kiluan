"""Pasar Desa (KONTRAK §3): UMKM, produk/jasa, paket wisata + itinerary + state machine."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from app.domain import mesin_status
from app.domain.enums import (
    EntitasLampiran,
    JenisProduk,
    KodePeran,
    SatuanHarga,
    StatusPaket,
    StatusProduk,
    StatusVerifikasiUmkm,
)
from app.domain.errors import Konflik, KesalahanValidasi, TidakBerwenang, TidakDitemukan
from app.domain.geo import jarak_m
from app.domain.konteks import Konteks
from app.domain.paginasi import keyset
from app.domain import entitas as E
from app.domain.ranking_pasar import skor_ranking
from app.layanan.lencana_warga import LencanaLayanan
from app.layanan.media import MediaLayanan

TINGKAT_RANK = {"lumba_lumba": 3, "bahari": 2, "tunas": 1}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hidup(e, desa_id: UUID):
    if e is None or e.desa_id != desa_id or getattr(e, "dihapus_pada", None) is not None:
        raise TidakDitemukan("Resource tak ditemukan.")
    return e


def _pengelola(konteks: Konteks, desa_id: UUID) -> bool:
    return konteks.admin_global() or bool(
        konteks.peran_di(desa_id) & {KodePeran.kontributor, KodePeran.perangkat_desa, KodePeran.admin}
    )


def _wajib_pengelola(konteks: Konteks, desa_id: UUID) -> None:
    if not _pengelola(konteks, desa_id):
        raise TidakBerwenang("Hanya pengelola desa.")


def _wajib_peran(konteks: Konteks, desa_id: UUID, peran: KodePeran) -> None:
    if _pengelola(konteks, desa_id):
        return
    if peran not in konteks.peran_di(desa_id):
        raise TidakBerwenang(f"Peran {peran.value} diperlukan.")


def _enum_nilai(enum_cls, nilai: str, field: str) -> str:
    try:
        return enum_cls(nilai).value
    except ValueError:
        raise KesalahanValidasi(
            f"Nilai {field} tidak valid.",
            rincian=[{"field": field, "pesan": "enum_tidak_valid"}],
        )


class PasarDesaLayanan:
    def __init__(self, store):
        self.store = store
        self.poin = LencanaLayanan(store)

    # --- UMKM ---

    async def daftar_umkm(self, konteks: Konteks, desa_id: UUID, data: dict) -> E.Umkm:
        _wajib_peran(konteks, desa_id, KodePeran.umkm)
        assert konteks.pengguna_id is not None
        lokasi = data.get("lokasi")
        if lokasi and isinstance(lokasi, dict):
            lokasi = (lokasi["lat"], lokasi["lng"])
        umkm = E.Umkm(
            desa_id=desa_id,
            pengguna_id=konteks.pengguna_id,
            bidang_id=data["bidang_id"],
            nama=data["nama"],
            deskripsi=data.get("deskripsi", ""),
            telepon=data.get("telepon", ""),
            whatsapp=data.get("whatsapp", ""),
            alamat=data.get("alamat", ""),
            lokasi=lokasi,
        )
        return await self.store.umkm.simpan(umkm)

    async def ambil_umkm_kelola(self, konteks: Konteks, desa_id: UUID, umkm_id: UUID) -> E.Umkm:
        umkm = _hidup(await self.store.umkm.ambil(umkm_id), desa_id)
        if not (_pengelola(konteks, desa_id) or umkm.pengguna_id == konteks.pengguna_id):
            raise TidakBerwenang("Hanya pemilik UMKM atau pengelola.")
        return umkm

    async def ubah_umkm(
        self, konteks: Konteks, desa_id: UUID, umkm_id: UUID, data: dict,
    ) -> E.Umkm:
        umkm = await self.ambil_umkm_kelola(konteks, desa_id, umkm_id)
        for field in ("nama", "deskripsi", "telepon", "whatsapp", "alamat", "bidang_id"):
            if field in data and data[field] is not None:
                setattr(umkm, field, data[field])
        if "lokasi" in data:
            lok = data["lokasi"]
            if lok is None:
                umkm.lokasi = None
            elif isinstance(lok, dict):
                umkm.lokasi = (lok["lat"], lok["lng"])
        umkm.diperbarui_pada = _now()
        return await self.store.umkm.simpan(umkm)

    async def verifikasi_umkm(
        self, konteks: Konteks, desa_id: UUID, umkm_id: UUID, keputusan: str,
    ) -> E.Umkm:
        _wajib_pengelola(konteks, desa_id)
        keputusan = _enum_nilai(StatusVerifikasiUmkm, keputusan, "keputusan")
        if keputusan not in ("terverifikasi", "ditolak"):
            raise KesalahanValidasi("Keputusan verifikasi tidak valid.")
        umkm = _hidup(await self.store.umkm.ambil(umkm_id), desa_id)
        umkm.status_verifikasi = keputusan
        umkm.diverifikasi_oleh = konteks.pengguna_id
        umkm.diperbarui_pada = _now()
        return await self.store.umkm.simpan(umkm)

    async def hapus_umkm(self, konteks: Konteks, desa_id: UUID, umkm_id: UUID) -> None:
        umkm = await self.ambil_umkm_kelola(konteks, desa_id, umkm_id)
        umkm.dihapus_pada = _now()
        await self.store.umkm.simpan(umkm)

    async def daftar_umkm_publik(
        self,
        desa_id: UUID,
        *,
        bidang_id: int | None = None,
        q: str | None = None,
        dekat: tuple[float, float] | None = None,
        radius_m: float | None = None,
        kursor: str | None = None,
        batas: int = 20,
        kelola: bool = False,
        konteks: Konteks | None = None,
        status_verifikasi: str | None = None,
    ) -> dict:
        rows = [
            u for u in await self.store.umkm.daftar(desa_id)
            if u.dihapus_pada is None
        ]
        if kelola and konteks and not _pengelola(konteks, desa_id):
            rows = [u for u in rows if u.pengguna_id == konteks.pengguna_id]
        if not kelola:
            rows = [u for u in rows if u.status_verifikasi == "terverifikasi"]
        elif status_verifikasi:
            rows = [u for u in rows if u.status_verifikasi == status_verifikasi]
        if bidang_id is not None:
            rows = [u for u in rows if u.bidang_id == bidang_id]
        if q:
            ql = q.lower()
            rows = [u for u in rows if ql in u.nama.lower() or ql in (u.deskripsi or "").lower()]
        if dekat is not None:
            lat, lng = dekat
            dengan_jarak: list[tuple[E.Umkm, float]] = []
            for u in rows:
                if u.lokasi:
                    jm = jarak_m(lat, lng, u.lokasi[0], u.lokasi[1])
                    if radius_m is None or jm <= radius_m:
                        dengan_jarak.append((u, jm))
            dengan_jarak.sort(key=lambda x: x[1])
            item = []
            for u, jm in dengan_jarak[:batas]:
                ringkas = await self._umkm_ringkas(u, desa_id)
                item.append({**ringkas, "jarak_m": round(jm, 1)})
            return {"item": item, "meta": {"kursor_berikutnya": None, "ada_lagi": len(dengan_jarak) > batas, "batas": batas}}
        rows = await self._urut_umkm(desa_id, rows)
        hal = keyset(rows, batas=batas, kursor=kursor)
        item = [await self._umkm_ringkas(u, desa_id) for u in hal.item]
        return {
            "item": item,
            "meta": hal.meta(),
        }

    async def detail_umkm(self, desa_id: UUID, umkm_id: UUID, *, kelola: bool = False) -> dict:
        umkm = await self.store.umkm.ambil(umkm_id)
        if kelola:
            _hidup(umkm, desa_id)
        else:
            if umkm is None or umkm.desa_id != desa_id or umkm.dihapus_pada is not None:
                raise TidakDitemukan("Resource tak ditemukan.")
            if umkm.status_verifikasi != "terverifikasi":
                raise TidakDitemukan("Resource tak ditemukan.")
        return await self._umkm_detail(umkm, desa_id)

    async def _sertifikasi_umkm(self, desa_id: UUID, umkm_id: UUID) -> dict | None:
        rows = await self.store.sertifikasi_owner.cari(
            desa_id=desa_id, subjek_tipe="umkm", subjek_id=umkm_id,
        )
        if not rows:
            return None
        return {"tingkat": rows[0].tingkat, "skor": rows[0].skor}

    async def _urut_umkm(self, desa_id: UUID, rows: list[E.Umkm]) -> list[E.Umkm]:
        sert_map: dict[UUID, str | None] = {}
        for s in await self.store.sertifikasi_owner.cari(desa_id=desa_id, subjek_tipe="umkm"):
            sert_map[s.subjek_id] = s.tingkat
        return sorted(
            rows,
            key=lambda u: skor_ranking(
                tingkat=sert_map.get(u.id),
                urut=u.urut,
                entity_id=u.id,
            ),
            reverse=True,
        )

    async def _umkm_ringkas(self, u: E.Umkm, desa_id: UUID) -> dict:
        bidang = await self.store.bidang_usaha.ambil(u.bidang_id) if hasattr(self.store.bidang_usaha, "ambil") else None
        if bidang is None:
            for b in await self.store.bidang_usaha.daftar():
                if b.id == u.bidang_id:
                    bidang = b
                    break
        return {
            "id": str(u.id),
            "nama": u.nama,
            "bidang": {"id": u.bidang_id, "kode": bidang.kode if bidang else "", "nama": bidang.nama if bidang else "", "ikon": getattr(bidang, "ikon", None) if bidang else None},
            "status_verifikasi": u.status_verifikasi,
            "lokasi": {"lat": u.lokasi[0], "lng": u.lokasi[1]} if u.lokasi else None,
            "sertifikasi": await self._sertifikasi_ringkas(desa_id, u.id),
        }

    async def _sertifikasi_ringkas(self, desa_id: UUID, umkm_id: UUID) -> dict | None:
        s = await self._sertifikasi_umkm(desa_id, umkm_id)
        if not s:
            return None
        return {"tingkat": s["tingkat"]}

    async def _umkm_detail(self, u: E.Umkm, desa_id: UUID) -> dict:
        ringkas = await self._umkm_ringkas(u, desa_id)
        produk = [
            p for p in await self.store.produk_jasa.daftar(desa_id)
            if p.umkm_id == u.id and p.dihapus_pada is None and p.status == "publikasi"
        ]
        return {
            **ringkas,
            "deskripsi": u.deskripsi,
            "telepon": u.telepon,
            "whatsapp": u.whatsapp,
            "alamat": u.alamat,
            "produk_ringkas": [{"id": str(p.id), "nama": p.nama, "harga": p.harga} for p in produk[:6]],
            "sertifikasi": await self._sertifikasi_umkm(desa_id, u.id),
            "dibuat_pada": u.dibuat_pada.isoformat() if u.dibuat_pada else None,
        }

    # --- Produk ---

    async def buat_produk(self, konteks: Konteks, desa_id: UUID, data: dict) -> E.ProdukJasa:
        umkm = await self.ambil_umkm_kelola(konteks, desa_id, data["umkm_id"])
        jenis = _enum_nilai(JenisProduk, data["jenis"], "jenis")
        satuan = _enum_nilai(SatuanHarga, data["satuan_harga"], "satuan_harga")
        produk = E.ProdukJasa(
            desa_id=desa_id,
            umkm_id=umkm.id,
            nama=data["nama"],
            jenis=jenis,
            harga=data["harga"],
            satuan_harga=satuan,
            deskripsi=data.get("deskripsi", ""),
            stok=None if jenis == "jasa" else data.get("stok"),
        )
        await self.store.produk_jasa.simpan(produk)
        await self.poin.award(desa_id, umkm.pengguna_id, "produk_terdaftar", "produk_jasa", produk.id)
        return produk

    async def _ambil_produk(self, desa_id: UUID, produk_id: UUID) -> E.ProdukJasa:
        return _hidup(await self.store.produk_jasa.ambil(produk_id), desa_id)

    async def detail_produk(self, desa_id: UUID, produk_id: UUID, *, kelola: bool = False) -> dict:
        produk = await self.store.produk_jasa.ambil(produk_id)
        if kelola:
            _hidup(produk, desa_id)
        else:
            if produk is None or produk.desa_id != desa_id or produk.dihapus_pada is not None:
                raise TidakDitemukan("Resource tak ditemukan.")
            if produk.status != "publikasi":
                raise TidakDitemukan("Resource tak ditemukan.")
            umkm = await self.store.umkm.ambil(produk.umkm_id)
            if (
                umkm is None
                or umkm.dihapus_pada is not None
                or umkm.status_verifikasi != "terverifikasi"
            ):
                raise TidakDitemukan("Resource tak ditemukan.")
        umkm = await self.store.umkm.ambil(produk.umkm_id)
        dto = self._produk_dto(produk, umkm)
        dto["media"] = await MediaLayanan(self.store).daftar_entitas_publik(
            EntitasLampiran.produk_jasa, produk.id,
        )
        return dto

    async def ubah_produk(
        self, konteks: Konteks, desa_id: UUID, produk_id: UUID, data: dict,
    ) -> E.ProdukJasa:
        produk = await self._ambil_produk(desa_id, produk_id)
        await self.ambil_umkm_kelola(konteks, desa_id, produk.umkm_id)
        for field in ("nama", "deskripsi", "harga", "stok"):
            if field in data and data[field] is not None:
                setattr(produk, field, data[field])
        produk.diperbarui_pada = _now()
        return await self.store.produk_jasa.simpan(produk)

    async def ubah_status_produk(
        self, konteks: Konteks, desa_id: UUID, produk_id: UUID, status: str,
    ) -> E.ProdukJasa:
        status = _enum_nilai(StatusProduk, status, "status")
        produk = await self._ambil_produk(desa_id, produk_id)
        await self.ambil_umkm_kelola(konteks, desa_id, produk.umkm_id)
        if status == "publikasi":
            umkm = await self.store.umkm.ambil(produk.umkm_id)
            if umkm is None or umkm.status_verifikasi != "terverifikasi":
                raise KesalahanValidasi(
                    "UMKM belum terverifikasi; produk tak boleh dipublikasi.",
                    rincian=[{"field": "status", "pesan": "umkm_belum_terverifikasi"}],
                )
        produk.status = status
        produk.diperbarui_pada = _now()
        return await self.store.produk_jasa.simpan(produk)

    async def hapus_produk(self, konteks: Konteks, desa_id: UUID, produk_id: UUID) -> None:
        produk = await self._ambil_produk(desa_id, produk_id)
        await self.ambil_umkm_kelola(konteks, desa_id, produk.umkm_id)
        produk.dihapus_pada = _now()
        await self.store.produk_jasa.simpan(produk)

    async def daftar_produk_publik(
        self,
        desa_id: UUID,
        *,
        umkm_id: UUID | None = None,
        jenis: str | None = None,
        bidang_id: int | None = None,
        q: str | None = None,
        kursor: str | None = None,
        batas: int = 20,
        kelola: bool = False,
        status: str | None = None,
    ) -> dict:
        umkm_map = {u.id: u for u in await self.store.umkm.daftar(desa_id)}
        rows = [p for p in await self.store.produk_jasa.daftar(desa_id) if p.dihapus_pada is None]
        if not kelola:
            rows = [
                p for p in rows
                if p.status == "publikasi"
                and (u := umkm_map.get(p.umkm_id)) is not None
                and u.dihapus_pada is None
                and u.status_verifikasi == "terverifikasi"
            ]
        elif status:
            rows = [p for p in rows if p.status == status]
        if umkm_id:
            rows = [p for p in rows if p.umkm_id == umkm_id]
        if jenis:
            rows = [p for p in rows if p.jenis == jenis]
        if bidang_id is not None:
            rows = [p for p in rows if umkm_map.get(p.umkm_id) and umkm_map[p.umkm_id].bidang_id == bidang_id]
        if q:
            ql = q.lower()
            rows = [p for p in rows if ql in p.nama.lower()]
        sert_map: dict[UUID, str | None] = {}
        for s in await self.store.sertifikasi_owner.cari(desa_id=desa_id, subjek_tipe="umkm"):
            sert_map[s.subjek_id] = s.tingkat
        rows = sorted(
            rows,
            key=lambda p: skor_ranking(
                tingkat=sert_map.get(p.umkm_id),
                urut=p.urut,
                entity_id=p.id,
            ),
            reverse=True,
        )
        hal = keyset(rows, batas=batas, kursor=kursor)
        return {
            "item": [self._produk_dto(p, umkm_map.get(p.umkm_id)) for p in hal.item],
            "meta": hal.meta(),
        }

    def _produk_dto(self, p: E.ProdukJasa, umkm: E.Umkm | None) -> dict:
        return {
            "id": str(p.id),
            "umkm": {"id": str(p.umkm_id), "nama": umkm.nama if umkm else ""},
            "nama": p.nama,
            "jenis": p.jenis,
            "deskripsi": p.deskripsi,
            "harga": p.harga,
            "satuan_harga": p.satuan_harga,
            "stok": p.stok,
            "status": p.status,
            "media": [],
        }

    # --- Paket ---

    async def buat_paket(self, konteks: Konteks, desa_id: UUID, data: dict) -> E.PaketWisata:
        _wajib_peran(konteks, desa_id, KodePeran.agen)
        assert konteks.pengguna_id is not None
        satuan = _enum_nilai(SatuanHarga, data["satuan_harga"], "satuan_harga")
        bentrok = [
            p for p in await self.store.paket_wisata.cari(desa_id=desa_id, slug=data["slug"])
            if p.dihapus_pada is None
        ]
        if bentrok:
            raise Konflik("Slug paket sudah dipakai di desa ini.")
        paket = E.PaketWisata(
            desa_id=desa_id,
            agen_id=konteks.pengguna_id,
            slug=data["slug"],
            nama=data["nama"],
            durasi_jam=data["durasi_jam"],
            harga=data["harga"],
            satuan_harga=satuan,
            deskripsi=data.get("deskripsi", ""),
            kuota_default=data.get("kuota_default", 0),
        )
        return await self.store.paket_wisata.simpan(paket)

    async def _ambil_paket(self, desa_id: UUID, paket_id: UUID) -> E.PaketWisata:
        return _hidup(await self.store.paket_wisata.ambil(paket_id), desa_id)

    async def ambil_paket_id_atau_slug(self, desa_id: UUID, id_atau_slug: str, *, kelola: bool = False) -> E.PaketWisata:
        try:
            pid = UUID(id_atau_slug)
            paket = await self.store.paket_wisata.ambil(pid)
        except ValueError:
            paket = await self.store.paket_wisata.ambil_slug(desa_id, id_atau_slug)
        if kelola:
            return _hidup(paket, desa_id)
        if paket is None or paket.desa_id != desa_id or paket.dihapus_pada is not None:
            raise TidakDitemukan("Resource tak ditemukan.")
        if paket.status != "publikasi":
            raise TidakDitemukan("Resource tak ditemukan.")
        return paket

    async def ubah_paket(
        self, konteks: Konteks, desa_id: UUID, paket_id: UUID, data: dict,
    ) -> E.PaketWisata:
        paket = await self._ambil_paket(desa_id, paket_id)
        if not (_pengelola(konteks, desa_id) or paket.agen_id == konteks.pengguna_id):
            raise TidakBerwenang("Hanya agen pemilik atau pengelola.")
        for field in ("nama", "deskripsi", "durasi_jam", "harga", "kuota_default"):
            if field in data and data[field] is not None:
                setattr(paket, field, data[field])
        paket.diperbarui_pada = _now()
        return await self.store.paket_wisata.simpan(paket)

    async def hapus_paket(self, konteks: Konteks, desa_id: UUID, paket_id: UUID) -> None:
        paket = await self._ambil_paket(desa_id, paket_id)
        if not (_pengelola(konteks, desa_id) or paket.agen_id == konteks.pengguna_id):
            raise TidakBerwenang("Hanya pemilik atau pengelola.")
        paket.dihapus_pada = _now()
        await self.store.paket_wisata.simpan(paket)

    async def transisi_paket(
        self, konteks: Konteks, desa_id: UUID, paket_id: UUID, aksi: str, catatan: str = "",
    ) -> E.PaketWisata:
        paket = await self._ambil_paket(desa_id, paket_id)
        if aksi == "ajukan":
            if paket.agen_id != konteks.pengguna_id and not _pengelola(konteks, desa_id):
                raise TidakBerwenang("Hanya agen pemilik boleh mengajukan.")
        elif aksi in ("setuju", "tolak", "minta_revisi"):
            _wajib_pengelola(konteks, desa_id)
        elif aksi == "arsip":
            if paket.agen_id != konteks.pengguna_id and not _pengelola(konteks, desa_id):
                raise TidakBerwenang("Hanya pemilik atau pengelola boleh mengarsip.")
        dari = paket.status
        ke = mesin_status.transisi("paket_wisata", dari, aksi)
        paket.status = ke
        paket.diperbarui_pada = _now()
        await self.store.paket_wisata.simpan(paket)
        assert konteks.pengguna_id is not None
        if mesin_status.tulis_log("paket_wisata", aksi):
            await self.store.kurasi_log.simpan(E.KurasiLog(
                entitas_tipe="paket_wisata",
                entitas_id=paket.id,
                dari_status=dari,
                ke_status=ke,
                kurator_id=konteks.pengguna_id,
                keputusan=aksi,
                catatan=catatan,
            ))
        if ke == "publikasi":
            await self.poin.award(desa_id, paket.agen_id, "paket_dipublikasi", "paket_wisata", paket.id)
        return paket

    async def tambah_item_paket(
        self, konteks: Konteks, desa_id: UUID, paket_id: UUID, data: dict,
    ) -> E.PaketItem:
        paket = await self._ambil_paket(desa_id, paket_id)
        if not (_pengelola(konteks, desa_id) or paket.agen_id == konteks.pengguna_id):
            raise TidakBerwenang("Hanya agen pemilik atau pengelola.")
        ref = data.get("destinasi_id") or data.get("layanan_id") or data.get("produk_jasa_id")
        if not ref and not data.get("judul"):
            raise KesalahanValidasi(
                "Item harus punya minimal satu referensi atau judul.",
                rincian=[{"field": "judul", "pesan": "referensi_atau_judul_wajib"}],
            )
        if ref:
            await self._validasi_referensi_item(desa_id, data)
        item = E.PaketItem(
            paket_id=paket_id,
            hari=data["hari"],
            urutan=data["urutan"],
            judul=data.get("judul", ""),
            deskripsi=data.get("deskripsi", ""),
            destinasi_id=data.get("destinasi_id"),
            layanan_id=data.get("layanan_id"),
            produk_jasa_id=data.get("produk_jasa_id"),
            durasi_menit=data.get("durasi_menit", 0),
        )
        return await self.store.paket_item.simpan(item)

    async def _validasi_referensi_item(self, desa_id: UUID, data: dict) -> None:
        if data.get("destinasi_id"):
            d = await self.store.destinasi.ambil(data["destinasi_id"])
            _hidup(d, desa_id)
        if data.get("layanan_id"):
            l = await self.store.layanan.ambil(data["layanan_id"])
            if l is None or l.desa_id != desa_id or l.dihapus_pada is not None:
                raise TidakDitemukan("Resource tak ditemukan.")
        if data.get("produk_jasa_id"):
            p = await self.store.produk_jasa.ambil(data["produk_jasa_id"])
            _hidup(p, desa_id)

    async def ubah_item_paket(
        self, konteks: Konteks, desa_id: UUID, paket_id: UUID, item_id: UUID, data: dict,
    ) -> E.PaketItem:
        paket = await self._ambil_paket(desa_id, paket_id)
        if not (_pengelola(konteks, desa_id) or paket.agen_id == konteks.pengguna_id):
            raise TidakBerwenang("Hanya agen pemilik atau pengelola.")
        item = await self.store.paket_item.ambil(item_id)
        if item is None or item.paket_id != paket_id:
            raise TidakDitemukan("Resource tak ditemukan.")
        for field in ("hari", "urutan", "judul", "deskripsi", "durasi_menit"):
            if field in data and data[field] is not None:
                setattr(item, field, data[field])
        for field in ("destinasi_id", "layanan_id", "produk_jasa_id"):
            if field in data:
                setattr(item, field, data[field])
        ref = item.destinasi_id or item.layanan_id or item.produk_jasa_id
        if not ref and not item.judul:
            raise KesalahanValidasi(
                "Item harus punya minimal satu referensi atau judul.",
                rincian=[{"field": "judul", "pesan": "referensi_atau_judul_wajib"}],
            )
        if ref:
            await self._validasi_referensi_item(desa_id, {
                "destinasi_id": item.destinasi_id,
                "layanan_id": item.layanan_id,
                "produk_jasa_id": item.produk_jasa_id,
            })
        return await self.store.paket_item.simpan(item)

    async def hapus_item_paket(
        self, konteks: Konteks, desa_id: UUID, paket_id: UUID, item_id: UUID,
    ) -> None:
        paket = await self._ambil_paket(desa_id, paket_id)
        if not (_pengelola(konteks, desa_id) or paket.agen_id == konteks.pengguna_id):
            raise TidakBerwenang("Hanya agen pemilik atau pengelola.")
        item = await self.store.paket_item.ambil(item_id)
        if item is None or item.paket_id != paket_id:
            raise TidakDitemukan("Resource tak ditemukan.")
        await self.store.paket_item.hapus(item_id)

    async def daftar_paket(
        self,
        desa_id: UUID,
        *,
        agen_id: UUID | None = None,
        status: str | None = None,
        q: str | None = None,
        kursor: str | None = None,
        batas: int = 20,
        kelola: bool = False,
        konteks: Konteks | None = None,
    ) -> dict:
        rows = [p for p in await self.store.paket_wisata.daftar(desa_id) if p.dihapus_pada is None]
        if kelola and konteks and not _pengelola(konteks, desa_id):
            rows = [p for p in rows if p.agen_id == konteks.pengguna_id]
        elif kelola and konteks and _pengelola(konteks, desa_id) and agen_id:
            rows = [p for p in rows if p.agen_id == agen_id]
        if not kelola:
            rows = [p for p in rows if p.status == "publikasi"]
        elif status:
            rows = [p for p in rows if p.status == status]
        if agen_id:
            rows = [p for p in rows if p.agen_id == agen_id]
        if q:
            ql = q.lower()
            rows = [p for p in rows if ql in p.nama.lower() or ql in p.slug.lower()]
        rows = sorted(rows, key=lambda p: p.urut, reverse=True)
        hal = keyset(rows, batas=batas, kursor=kursor)
        return {
            "item": [await self._paket_ringkas(p) for p in hal.item],
            "meta": hal.meta(),
        }

    async def detail_paket(self, desa_id: UUID, id_atau_slug: str, *, kelola: bool = False) -> dict:
        paket = await self.ambil_paket_id_atau_slug(desa_id, id_atau_slug, kelola=kelola)
        items = await self.store.paket_item.daftar_paket(paket.id)
        ringkas = await self._paket_ringkas(paket)
        media = await MediaLayanan(self.store).daftar_entitas_publik(
            EntitasLampiran.paket_wisata, paket.id,
        )
        return {
            **ringkas,
            "deskripsi": paket.deskripsi,
            "media": media,
            "item": [await self._item_dto(i) for i in items],
        }

    async def _paket_ringkas(self, p: E.PaketWisata) -> dict:
        agen = await self.store.pengguna.ambil(p.agen_id)
        media = await MediaLayanan(self.store).daftar_entitas_publik(
            EntitasLampiran.paket_wisata, p.id,
        )
        media_utama = next((m for m in media if m.get("utama")), media[0] if media else None)
        return {
            "id": str(p.id),
            "slug": p.slug,
            "nama": p.nama,
            "agen": {"id": str(p.agen_id), "nama": agen.nama if agen else "Agen"},
            "durasi_jam": p.durasi_jam,
            "harga": p.harga,
            "satuan_harga": p.satuan_harga,
            "kuota_default": p.kuota_default,
            "status": p.status,
            "media_utama": media_utama,
        }

    async def _item_dto(self, i: E.PaketItem) -> dict:
        destinasi = None
        if i.destinasi_id:
            d = await self.store.destinasi.ambil(i.destinasi_id)
            destinasi = {"id": str(i.destinasi_id), "nama": d.nama if d else None}
        layanan = None
        if i.layanan_id:
            l = await self.store.layanan.ambil(i.layanan_id)
            layanan = {"id": str(i.layanan_id), "nama": l.nama if l else None}
        produk_jasa = None
        if i.produk_jasa_id:
            p = await self.store.produk_jasa.ambil(i.produk_jasa_id)
            produk_jasa = {"id": str(i.produk_jasa_id), "nama": p.nama if p else None}
        return {
            "id": str(i.id),
            "hari": i.hari,
            "urutan": i.urutan,
            "judul": i.judul,
            "deskripsi": i.deskripsi,
            "destinasi": destinasi,
            "layanan": layanan,
            "produk_jasa": produk_jasa,
            "durasi_menit": i.durasi_menit,
        }

    async def daftar_kurasi_log(
        self,
        konteks: Konteks,
        desa_id: UUID,
        *,
        entitas_tipe: str | None = None,
        entitas_id: UUID | None = None,
        batas: int = 20,
        kursor: str | None = None,
    ) -> dict:
        _wajib_pengelola(konteks, desa_id)
        rows = await self.store.kurasi_log.cari(
            entitas_tipe=entitas_tipe, entitas_id=entitas_id,
        )
        rows = sorted(rows, key=lambda r: r.urut, reverse=True)
        hal = keyset(rows, batas=batas, kursor=kursor)
        return {
            "item": [
                {
                    "id": str(l.id),
                    "entitas_tipe": l.entitas_tipe,
                    "entitas_id": str(l.entitas_id),
                    "dari_status": l.dari_status,
                    "ke_status": l.ke_status,
                    "keputusan": l.keputusan,
                    "catatan": l.catatan,
                    "dibuat_pada": l.dibuat_pada.isoformat() if l.dibuat_pada else None,
                }
                for l in hal.item
            ],
            "meta": hal.meta(),
        }
