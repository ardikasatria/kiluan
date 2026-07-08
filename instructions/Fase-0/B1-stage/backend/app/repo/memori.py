"""Repo in-memory ASYNC untuk uji tanpa DB (test double setia repo SQL).

Sesuai ADR-0003 (async end-to-end), method dibuat `async` agar tanda tangan
identik dengan `repo/sql.py`. Implementasi tetap in-memory (tak ada I/O nyata).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from ..domain import entitas as E
from ..domain.enums import StatusDesa
from ..domain.errors import Konflik


def _now() -> datetime:
    return datetime.now(timezone.utc)


class RepoPengguna:
    def __init__(self):
        self._data: dict[UUID, E.Pengguna] = {}
        self._email: dict[str, UUID] = {}

    async def tambah(self, p: E.Pengguna) -> E.Pengguna:
        if p.email in self._email:
            raise Konflik("email sudah terdaftar", [{"field": "email", "pesan": "duplikat"}])
        self._data[p.id] = p
        self._email[p.email] = p.id
        return p

    async def ambil(self, id: UUID) -> Optional[E.Pengguna]:
        return self._data.get(id)

    async def ambil_email(self, email: str) -> Optional[E.Pengguna]:
        pid = self._email.get(email.strip().lower())
        return self._data.get(pid) if pid else None


class RepoDesa:
    def __init__(self):
        self._data: dict[UUID, E.Desa] = {}
        self._slug: dict[str, UUID] = {}

    async def tambah(self, d: E.Desa) -> E.Desa:
        if d.slug in self._slug:
            raise Konflik("slug desa sudah dipakai", [{"field": "slug", "pesan": "duplikat"}])
        self._data[d.id] = d
        self._slug[d.slug] = d.id
        return d

    async def ambil(self, id: UUID) -> Optional[E.Desa]:
        return self._data.get(id)

    async def ambil_slug(self, slug: str) -> Optional[E.Desa]:
        did = self._slug.get(slug)
        return self._data.get(did) if did else None

    async def daftar_aktif(self) -> list[E.Desa]:
        return [d for d in self._data.values() if d.status == StatusDesa.aktif]


class RepoKeanggotaan:
    def __init__(self):
        self._data: dict[UUID, E.Keanggotaan] = {}

    def _kunci(self, k: E.Keanggotaan) -> tuple:
        return (k.pengguna_id, k.desa_id, k.peran)

    async def tambah(self, k: E.Keanggotaan) -> E.Keanggotaan:
        for ada in self._data.values():
            if self._kunci(ada) == self._kunci(k):
                raise Konflik("keanggotaan (pengguna, desa, peran) sudah ada")
        self._data[k.id] = k
        return k

    async def ambil(self, id: UUID) -> Optional[E.Keanggotaan]:
        return self._data.get(id)

    async def daftar_pengguna(self, pengguna_id: UUID) -> list[E.Keanggotaan]:
        return [k for k in self._data.values() if k.pengguna_id == pengguna_id]

    async def daftar_desa(self, desa_id: UUID, peran=None, status=None) -> list[E.Keanggotaan]:
        out = [k for k in self._data.values() if k.desa_id == desa_id]
        if peran is not None:
            out = [k for k in out if k.peran == peran]
        if status is not None:
            out = [k for k in out if k.status == status]
        return out


class RepoToken:
    def __init__(self):
        self._data: dict[UUID, E.TokenAuth] = {}

    async def tambah(self, t: E.TokenAuth) -> E.TokenAuth:
        self._data[t.id] = t
        return t

    async def ambil_hash(self, token_hash: str, tipe) -> Optional[E.TokenAuth]:
        for t in self._data.values():
            if t.token_hash == token_hash and t.tipe == tipe:
                return t
        return None

    async def tandai_pakai(self, t: E.TokenAuth) -> None:
        t.dipakai_pada = _now()

    async def cabut_semua(self, pengguna_id: UUID, tipe) -> int:
        n = 0
        for t in self._data.values():
            if t.pengguna_id == pengguna_id and t.tipe == tipe and t.dipakai_pada is None:
                t.dipakai_pada = _now()
                n += 1
        return n


class RepoKategori:
    def __init__(self):
        self._data: dict[int, E.Kategori] = {}
        self._seq = 0

    async def tambah(self, k: E.Kategori) -> E.Kategori:
        self._seq += 1
        k.id = self._seq
        self._data[k.id] = k
        return k

    async def ambil(self, id: int) -> Optional[E.Kategori]:
        return self._data.get(id)


class RepoTag:
    def __init__(self):
        self._data: dict[int, E.Tag] = {}
        self._seq = 0

    async def tambah(self, t: E.Tag) -> E.Tag:
        self._seq += 1
        t.id = self._seq
        self._data[t.id] = t
        return t

    async def daftar(self, desa_id: UUID) -> list[E.Tag]:
        return [t for t in self._data.values() if t.desa_id in (None, desa_id)]


class RepoDestinasi:
    def __init__(self):
        self._data: dict[UUID, E.Destinasi] = {}

    async def tambah(self, d: E.Destinasi) -> E.Destinasi:
        for ada in self._data.values():
            if ada.desa_id == d.desa_id and ada.slug == d.slug and ada.dihapus_pada is None:
                raise Konflik(
                    "slug destinasi sudah dipakai di desa ini",
                    [{"field": "slug", "pesan": "duplikat"}],
                )
        self._data[d.id] = d
        return d

    async def ambil(self, id: UUID) -> Optional[E.Destinasi]:
        return self._data.get(id)

    async def ambil_slug(self, desa_id: UUID, slug: str) -> Optional[E.Destinasi]:
        for d in self._data.values():
            if d.desa_id == desa_id and d.slug == slug and d.dihapus_pada is None:
                return d
        return None

    async def daftar(self, desa_id: UUID) -> list[E.Destinasi]:
        return [d for d in self._data.values() if d.desa_id == desa_id]

    async def semua_desa_aktif(self, desa_aktif: set[UUID]) -> list[E.Destinasi]:
        return [d for d in self._data.values() if d.desa_id in desa_aktif]


class RepoLayanan:
    def __init__(self):
        self._data: dict[UUID, E.Layanan] = {}

    async def tambah(self, l: E.Layanan) -> E.Layanan:
        self._data[l.id] = l
        return l

    async def ambil(self, id: UUID) -> Optional[E.Layanan]:
        return self._data.get(id)

    async def daftar(self, desa_id: UUID) -> list[E.Layanan]:
        return [l for l in self._data.values() if l.desa_id == desa_id]


class RepoMedia:
    def __init__(self):
        self._data: dict[UUID, E.Media] = {}

    async def tambah(self, m: E.Media) -> E.Media:
        self._data[m.id] = m
        return m

    async def ambil(self, id: UUID) -> Optional[E.Media]:
        return self._data.get(id)


class RepoLampiran:
    def __init__(self):
        self._data: dict[UUID, E.Lampiran] = {}

    async def tambah(self, l: E.Lampiran) -> E.Lampiran:
        self._data[l.id] = l
        return l

    async def ambil(self, id: UUID) -> Optional[E.Lampiran]:
        return self._data.get(id)

    async def daftar_entitas(self, entitas_tipe, entitas_id: UUID) -> list[E.Lampiran]:
        return [
            l for l in self._data.values()
            if l.entitas_tipe == entitas_tipe and l.entitas_id == entitas_id
        ]

    async def hapus(self, id: UUID) -> None:
        self._data.pop(id, None)


class ObjectStorePalsu:
    def __init__(self):
        self._objek: set[str] = set()

    async def taruh(self, objek: str) -> None:  # simulasi PUT klien
        self._objek.add(objek)

    async def ada(self, objek: str) -> bool:
        return objek in self._objek

    async def presign_put(self, objek: str) -> str:
        return f"https://minio.local/put/{objek}?X-Amz=sig"


class Penyimpanan:
    """Agregat repo in-memory (async)."""

    def __init__(self):
        self.pengguna = RepoPengguna()
        self.desa = RepoDesa()
        self.keanggotaan = RepoKeanggotaan()
        self.token = RepoToken()
        self.kategori = RepoKategori()
        self.tag = RepoTag()
        self.destinasi = RepoDestinasi()
        self.layanan = RepoLayanan()
        self.media = RepoMedia()
        self.lampiran = RepoLampiran()
        self.objek = ObjectStorePalsu()
