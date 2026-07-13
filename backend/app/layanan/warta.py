"""Warta — berita/blog per tenant (KONTRAK addendum F2 §B.1)."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from app.domain import mesin_status
from app.domain import entitas as E
from app.domain.enums import KategoriBerita, KodePeran, StatusBerita
from app.domain.errors import KesalahanValidasi, TidakBerwenang, TidakDitemukan, TidakTerautentikasi
from app.domain.konteks import Konteks
from app.domain.paginasi import keyset


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _pengelola(konteks: Konteks, desa_id: UUID) -> bool:
    return konteks.admin_global() or bool(
        konteks.peran_di(desa_id) & {KodePeran.kontributor, KodePeran.perangkat_desa, KodePeran.admin}
    )


def _wajib_pengelola(konteks: Konteks, desa_id: UUID) -> None:
    if not _pengelola(konteks, desa_id):
        raise TidakBerwenang("Hanya pengelola desa.")


def _enum_nilai(enum_cls, nilai: str, field: str) -> str:
    try:
        return enum_cls(nilai).value
    except ValueError:
        raise KesalahanValidasi(
            f"Nilai {field} tidak valid.",
            rincian=[{"field": field, "pesan": "enum_tidak_valid"}],
        )


def _publik_siap(b: E.Berita, sekarang: datetime | None = None) -> bool:
    if b.status != StatusBerita.publikasi.value or b.dihapus_pada is not None:
        return False
    if b.terbit_pada is None:
        return True
    return b.terbit_pada <= (sekarang or _now())


def _sync_urut(b: E.Berita) -> None:
    ts = b.terbit_pada or b.dibuat_pada
    if ts:
        b.urut = int(ts.timestamp() * 1_000_000)


class WartaLayanan:
    def __init__(self, store):
        self.store = store

    async def _ambil(self, desa_id: UUID, id_: UUID, *, publik: bool) -> E.Berita:
        b = await self.store.berita.ambil(id_)
        if b is None or b.desa_id != desa_id or b.dihapus_pada is not None:
            raise TidakDitemukan("Berita tak ditemukan.")
        if publik and not _publik_siap(b):
            raise TidakDitemukan("Berita tak ditemukan.")
        return b

    async def _ambil_slug(self, desa_id: UUID, slug: str, *, publik: bool) -> E.Berita:
        b = await self.store.berita.ambil_slug(desa_id, slug)
        if b is None:
            raise TidakDitemukan("Berita tak ditemukan.")
        if publik and not _publik_siap(b):
            raise TidakDitemukan("Berita tak ditemukan.")
        return b

    def _boleh_kelola(self, konteks: Konteks, desa_id: UUID, b: E.Berita) -> bool:
        return _pengelola(konteks, desa_id) or (
            konteks.pengguna_id is not None and b.penulis_id == konteks.pengguna_id
        )

    async def buat(self, konteks: Konteks, desa_id: UUID, data: dict) -> E.Berita:
        _wajib_pengelola(konteks, desa_id)
        assert konteks.pengguna_id is not None
        kategori = _enum_nilai(KategoriBerita, data.get("kategori", "lainnya"), "kategori")
        berita = E.Berita(
            desa_id=desa_id,
            penulis_id=konteks.pengguna_id,
            slug=data["slug"],
            judul=data["judul"],
            ringkasan=data.get("ringkasan"),
            konten=data.get("konten", ""),
            sampul_media_id=data.get("sampul_media_id"),
            kategori=kategori,
            status=StatusBerita.draft.value,
            sorotan=bool(data.get("sorotan", False)),
        )
        _sync_urut(berita)
        return await self.store.berita.simpan(berita)

    async def ubah(self, konteks: Konteks, desa_id: UUID, id_: UUID, data: dict) -> E.Berita:
        b = await self._ambil(desa_id, id_, publik=False)
        if not self._boleh_kelola(konteks, desa_id, b):
            raise TidakBerwenang("Hanya penulis atau pengelola.")
        if "slug" in data and data["slug"] is not None:
            b.slug = data["slug"]
        for field in ("judul", "ringkasan", "konten", "sampul_media_id", "sorotan"):
            if field in data and data[field] is not None:
                setattr(b, field, data[field])
        if "kategori" in data and data["kategori"] is not None:
            b.kategori = _enum_nilai(KategoriBerita, data["kategori"], "kategori")
        b.diperbarui_pada = _now()
        _sync_urut(b)
        return await self.store.berita.simpan(b)

    async def ubah_status(
        self,
        konteks: Konteks,
        desa_id: UUID,
        id_: UUID,
        aksi: str,
        terbit_pada: datetime | None = None,
    ) -> E.Berita:
        _wajib_pengelola(konteks, desa_id)
        b = await self._ambil(desa_id, id_, publik=False)
        ke = mesin_status.transisi("berita", b.status, aksi)
        b.status = ke
        if terbit_pada is not None:
            b.terbit_pada = terbit_pada
        b.diperbarui_pada = _now()
        _sync_urut(b)
        return await self.store.berita.simpan(b)

    async def hapus(self, konteks: Konteks, desa_id: UUID, id_: UUID) -> None:
        b = await self._ambil(desa_id, id_, publik=False)
        if not self._boleh_kelola(konteks, desa_id, b):
            raise TidakBerwenang("Hanya penulis atau pengelola.")
        b.dihapus_pada = _now()
        b.diperbarui_pada = _now()
        await self.store.berita.simpan(b)

    async def tempel_tag(self, konteks: Konteks, desa_id: UUID, id_: UUID, tag_id: int) -> E.Berita:
        b = await self._ambil(desa_id, id_, publik=False)
        if not self._boleh_kelola(konteks, desa_id, b):
            raise TidakBerwenang("Hanya penulis atau pengelola.")
        if await self.store.tag.ambil(tag_id) is None:
            raise TidakDitemukan("Tag tak ditemukan.")
        await self.store.berita.tempel_tag(id_, tag_id)
        return await self.store.berita.ambil(id_)  # type: ignore[return-value]

    async def lepas_tag(self, konteks: Konteks, desa_id: UUID, id_: UUID, tag_id: int) -> E.Berita:
        b = await self._ambil(desa_id, id_, publik=False)
        if not self._boleh_kelola(konteks, desa_id, b):
            raise TidakBerwenang("Hanya penulis atau pengelola.")
        await self.store.berita.lepas_tag(id_, tag_id)
        return await self.store.berita.ambil(id_)  # type: ignore[return-value]

    async def detail(self, konteks: Konteks, desa_id: UUID, id_atau_slug: str | UUID) -> dict:
        publik = not _pengelola(konteks, desa_id)
        if isinstance(id_atau_slug, UUID):
            b = await self._ambil(desa_id, id_atau_slug, publik=publik)
        else:
            try:
                uid = UUID(id_atau_slug)
                b = await self._ambil(desa_id, uid, publik=publik)
            except ValueError:
                b = await self._ambil_slug(desa_id, id_atau_slug, publik=publik)
        kelola = _pengelola(konteks, desa_id)
        return await self._dto(b, detail=True, kelola=kelola)

    async def daftar(
        self,
        konteks: Konteks,
        desa_id: UUID,
        *,
        kategori: str | None = None,
        status: str | None = None,
        tag: str | None = None,
        sorotan: bool | None = None,
        kursor: str | None = None,
        batas: int = 20,
    ) -> dict:
        kelola = _pengelola(konteks, desa_id)
        rows = [b for b in await self.store.berita.daftar(desa_id) if b.dihapus_pada is None]
        if not kelola:
            rows = [b for b in rows if _publik_siap(b)]
        elif status:
            rows = [b for b in rows if b.status == status]
        if kategori:
            rows = [b for b in rows if b.kategori == kategori]
        if sorotan is not None:
            rows = [b for b in rows if b.sorotan == sorotan]
        if tag:
            tag_row = None
            for t in await self.store.tag.daftar(desa_id):
                if t.kode == tag:
                    tag_row = t
                    break
            if tag_row is None:
                rows = []
            else:
                rows = [b for b in rows if tag_row.id in b.tag_ids]
        hal = keyset(rows, batas=batas, kursor=kursor, kunci=lambda r: (r.urut, str(r.id)))
        return {
            "item": [await self._dto(b, detail=False, kelola=kelola) for b in hal.item],
            "meta": hal.meta(),
        }

    async def _dto(self, b: E.Berita, *, detail: bool, kelola: bool) -> dict:
        sampul = None
        if b.sampul_media_id:
            media = await self.store.media.ambil(b.sampul_media_id)
            if media and getattr(media, "url", None):
                sampul = {"url": media.url}
        penulis = await self.store.pengguna.ambil(b.penulis_id)
        tag_dto = []
        for tid in b.tag_ids:
            t = await self.store.tag.ambil(tid)
            if t:
                tag_dto.append({"id": t.id, "kode": t.kode, "nama": t.nama})
        dto: dict = {
            "id": str(b.id),
            "slug": b.slug,
            "judul": b.judul,
            "ringkasan": b.ringkasan,
            "kategori": b.kategori,
            "sampul": sampul,
            "sorotan": b.sorotan,
            "terbit_pada": b.terbit_pada.isoformat() if b.terbit_pada else None,
            "tag": tag_dto,
            "penulis": {"nama": penulis.nama if penulis else ""},
        }
        if detail:
            dto["konten"] = b.konten
        if kelola:
            dto["status"] = b.status
            dto["dihapus_pada"] = b.dihapus_pada.isoformat() if b.dihapus_pada else None
        return dto
