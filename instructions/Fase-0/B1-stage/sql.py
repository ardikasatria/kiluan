"""Repo async SQLAlchemy — implementasi produksi untuk slice Auth (B1).

Pola penting (baca ADR-0003 + catatan B1):
- Method `ambil*` mengembalikan **baris ORM** (`app.model.tabel`) yang **attached**
  ke session, sehingga mutasi in-place oleh service (mis. `p.status = aktif`,
  `t.dipakai_pada = now`) **ikut ter-persist** saat commit — sama semantiknya
  dengan repo in-memory.
- Enum di domain adalah `str`-subclass, jadi perbandingan `row.status == StatusX`
  dan assignment `row.status = StatusX` bekerja tanpa konversi.
- `tambah` menerima entitas domain (dataclass) lalu membangun baris ORM.
- Keanggotaan memakai hybrid `peran` (kode <-> peran_id) di model.

Repo destinasi/media/kalender ditambahkan di B2/B4 mengikuti pola yang sama.
Tanda tangan method identik dengan `repo/memori.py`.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..domain import entitas as E
from ..domain.errors import Konflik
from ..model import tabel as M


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _v(x):
    """Ambil nilai string dari enum/str (enum domain = str-subclass)."""
    return x.value if hasattr(x, "value") else x


class RepoPenggunaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, p: E.Pengguna) -> E.Pengguna:
        row = M.Pengguna(
            id=p.id, email=p.email, nama=p.nama, kata_sandi_hash=p.kata_sandi_hash,
            telepon=p.telepon, status=_v(p.status),
            email_terverifikasi_pada=p.email_terverifikasi_pada, login_terakhir=p.login_terakhir,
        )
        self.s.add(row)
        try:
            await self.s.flush()
        except IntegrityError:
            raise Konflik("email sudah terdaftar", [{"field": "email", "pesan": "duplikat"}])
        return p

    async def ambil(self, id: UUID) -> Optional[M.Pengguna]:
        return await self.s.get(M.Pengguna, id)

    async def ambil_email(self, email: str) -> Optional[M.Pengguna]:
        res = await self.s.execute(
            select(M.Pengguna).where(M.Pengguna.email == email.strip().lower())
        )
        return res.scalar_one_or_none()


class RepoDesaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, d: E.Desa) -> E.Desa:
        # Penulisan desa (dengan geometry) dilakukan lewat service B0/B4; di sini
        # cukup atribut skalar. Geometry di-set terpisah bila perlu.
        row = M.Desa(id=d.id, slug=d.slug, nama=d.nama, status=_v(d.status))
        self.s.add(row)
        try:
            await self.s.flush()
        except IntegrityError:
            raise Konflik("slug desa sudah dipakai", [{"field": "slug", "pesan": "duplikat"}])
        return d

    async def ambil(self, id: UUID) -> Optional[M.Desa]:
        return await self.s.get(M.Desa, id)

    async def ambil_slug(self, slug: str) -> Optional[M.Desa]:
        res = await self.s.execute(select(M.Desa).where(M.Desa.slug == slug))
        return res.scalar_one_or_none()

    async def daftar_aktif(self) -> list[M.Desa]:
        res = await self.s.execute(select(M.Desa).where(M.Desa.status == "aktif"))
        return list(res.scalars().all())


class RepoKeanggotaanSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, k: E.Keanggotaan) -> E.Keanggotaan:
        row = M.Keanggotaan(
            id=k.id, pengguna_id=k.pengguna_id, desa_id=k.desa_id,
            peran_id=M.PERAN_ID[_v(k.peran)], status=_v(k.status),
        )
        self.s.add(row)
        try:
            await self.s.flush()
        except IntegrityError:
            raise Konflik("keanggotaan (pengguna, desa, peran) sudah ada")
        return k

    async def ambil(self, id: UUID) -> Optional[M.Keanggotaan]:
        return await self.s.get(M.Keanggotaan, id)

    async def daftar_pengguna(self, pengguna_id: UUID) -> list[M.Keanggotaan]:
        res = await self.s.execute(
            select(M.Keanggotaan).where(M.Keanggotaan.pengguna_id == pengguna_id)
        )
        return list(res.scalars().all())

    async def daftar_desa(self, desa_id: UUID, peran=None, status=None) -> list[M.Keanggotaan]:
        q = select(M.Keanggotaan).where(M.Keanggotaan.desa_id == desa_id)
        if peran is not None:
            q = q.where(M.Keanggotaan.peran_id == M.PERAN_ID[_v(peran)])
        if status is not None:
            q = q.where(M.Keanggotaan.status == _v(status))
        res = await self.s.execute(q)
        return list(res.scalars().all())


class RepoTokenSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, t: E.TokenAuth) -> E.TokenAuth:
        row = M.TokenAuth(
            id=t.id, pengguna_id=t.pengguna_id, tipe=_v(t.tipe),
            token_hash=t.token_hash, kedaluwarsa_pada=t.kedaluwarsa_pada, dipakai_pada=t.dipakai_pada,
        )
        self.s.add(row)
        await self.s.flush()
        return t

    async def ambil_hash(self, token_hash: str, tipe) -> Optional[M.TokenAuth]:
        res = await self.s.execute(
            select(M.TokenAuth).where(
                M.TokenAuth.token_hash == token_hash, M.TokenAuth.tipe == _v(tipe)
            )
        )
        return res.scalar_one_or_none()

    async def tandai_pakai(self, t: M.TokenAuth) -> None:
        t.dipakai_pada = _now()  # baris ORM attached → persist saat commit

    async def cabut_semua(self, pengguna_id: UUID, tipe) -> int:
        res = await self.s.execute(
            update(M.TokenAuth)
            .where(
                M.TokenAuth.pengguna_id == pengguna_id,
                M.TokenAuth.tipe == _v(tipe),
                M.TokenAuth.dipakai_pada.is_(None),
            )
            .values(dipakai_pada=_now())
        )
        return res.rowcount or 0


class RepoReferensiSQL:
    """Baca referensi (peran, kategori) untuk endpoint /peran & /kategori."""

    def __init__(self, s: AsyncSession):
        self.s = s

    async def daftar_peran(self) -> list[M.Peran]:
        res = await self.s.execute(select(M.Peran).order_by(M.Peran.id))
        return list(res.scalars().all())

    async def daftar_kategori(self) -> list[M.Kategori]:
        res = await self.s.execute(select(M.Kategori).order_by(M.Kategori.urutan))
        return list(res.scalars().all())


class Penyimpanan:
    """Agregat repo SQL untuk satu request (bound ke satu AsyncSession).

    Repo destinasi/layanan/media/lampiran/kalender ditambahkan di B2/B4.
    """

    def __init__(self, sesi: AsyncSession):
        self.sesi = sesi
        self.pengguna = RepoPenggunaSQL(sesi)
        self.desa = RepoDesaSQL(sesi)
        self.keanggotaan = RepoKeanggotaanSQL(sesi)
        self.token = RepoTokenSQL(sesi)
        self.referensi = RepoReferensiSQL(sesi)
