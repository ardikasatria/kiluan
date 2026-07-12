"""Repo in-memory — Warta (berita) & Genta (peristiwa, notifikasi)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from ..domain import entitas as E
from ..domain.errors import Konflik


def _now() -> datetime:
    return datetime.now(timezone.utc)


class RepoBerita:
    def __init__(self):
        self._data: dict[UUID, E.Berita] = {}
        self._tags: dict[tuple[UUID, int], E.BeritaTag] = {}

    async def simpan(self, b: E.Berita) -> E.Berita:
        for ada in self._data.values():
            if (
                ada.id != b.id
                and ada.desa_id == b.desa_id
                and ada.slug == b.slug
                and ada.dihapus_pada is None
                and b.dihapus_pada is None
            ):
                raise Konflik(
                    "slug berita sudah dipakai di desa ini",
                    [{"field": "slug", "pesan": "duplikat"}],
                )
        self._data[b.id] = b
        b.tag_ids = await self._tag_ids(b.id)
        return b

    async def _tag_ids(self, berita_id: UUID) -> list[int]:
        return sorted(t.tag_id for k, t in self._tags.items() if k[0] == berita_id)

    async def ambil(self, id_: UUID) -> Optional[E.Berita]:
        b = self._data.get(id_)
        if b is None:
            return None
        b.tag_ids = await self._tag_ids(id_)
        return b

    async def ambil_slug(self, desa_id: UUID, slug: str) -> Optional[E.Berita]:
        for b in self._data.values():
            if b.desa_id == desa_id and b.slug == slug and b.dihapus_pada is None:
                b.tag_ids = await self._tag_ids(b.id)
                return b
        return None

    async def daftar(self, desa_id: UUID) -> list[E.Berita]:
        out = [b for b in self._data.values() if b.desa_id == desa_id]
        for b in out:
            b.tag_ids = await self._tag_ids(b.id)
        return out

    async def tempel_tag(self, berita_id: UUID, tag_id: int) -> None:
        k = (berita_id, tag_id)
        if k not in self._tags:
            self._tags[k] = E.BeritaTag(berita_id=berita_id, tag_id=tag_id)

    async def lepas_tag(self, berita_id: UUID, tag_id: int) -> None:
        self._tags.pop((berita_id, tag_id), None)


class RepoPeristiwa:
    def __init__(self):
        self._data: dict[UUID, E.Peristiwa] = {}

    async def simpan(self, p: E.Peristiwa) -> E.Peristiwa:
        self._data[p.id] = p
        return p

    async def ambil(self, id_: UUID) -> Optional[E.Peristiwa]:
        return self._data.get(id_)

    async def belum_diproses(self, batas: int = 50) -> list[E.Peristiwa]:
        rows = [p for p in self._data.values() if p.diproses_pada is None]
        rows.sort(key=lambda p: p.dibuat_pada)
        return rows[:batas]

    async def tandai_diproses(self, id_: UUID) -> None:
        p = self._data.get(id_)
        if p:
            p.diproses_pada = _now()

    async def cari(self, **kwargs) -> list[E.Peristiwa]:
        rows = list(self._data.values())
        for k, v in kwargs.items():
            if v is not None:
                rows = [r for r in rows if getattr(r, k, None) == v]
        return rows


class RepoNotifikasi:
    def __init__(self):
        self._data: dict[UUID, E.Notifikasi] = {}

    def _kunci_idempoten(self, n: E.Notifikasi) -> tuple | None:
        if n.peristiwa_id is None:
            return None
        return (n.peristiwa_id, n.penerima_id, n.tipe)

    async def tambah_idempoten(self, n: E.Notifikasi) -> bool:
        kunci = self._kunci_idempoten(n)
        if kunci is not None:
            for ada in self._data.values():
                if self._kunci_idempoten(ada) == kunci:
                    return False
        self._data[n.id] = n
        return True

    async def ambil(self, id_: UUID) -> Optional[E.Notifikasi]:
        return self._data.get(id_)

    async def daftar_inbox(
        self,
        desa_id: UUID,
        penerima_id: UUID,
        *,
        status: str | None = None,
    ) -> list[E.Notifikasi]:
        rows = [
            n for n in self._data.values()
            if n.desa_id == desa_id and n.penerima_id == penerima_id
        ]
        if status is not None:
            rows = [n for n in rows if n.status == status]
        return rows

    async def hitung_belum_dibaca(self, desa_id: UUID, penerima_id: UUID) -> int:
        rows = await self.daftar_inbox(desa_id, penerima_id, status="belum_dibaca")
        return len(rows)

    async def tandai_dibaca(self, id_: UUID, penerima_id: UUID) -> Optional[E.Notifikasi]:
        n = self._data.get(id_)
        if n is None or n.penerima_id != penerima_id:
            return None
        n.status = "dibaca"
        n.dibaca_pada = _now()
        return n

    async def tandai_semua_dibaca(self, desa_id: UUID, penerima_id: UUID) -> int:
        n = 0
        for row in self._data.values():
            if (
                row.desa_id == desa_id
                and row.penerima_id == penerima_id
                and row.status == "belum_dibaca"
            ):
                row.status = "dibaca"
                row.dibaca_pada = _now()
                n += 1
        return n
