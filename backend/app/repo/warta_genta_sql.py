"""Repo SQL — Warta (berita) & Genta (peristiwa, notifikasi)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..domain import entitas as E
from ..domain.errors import Konflik
from ..model import tabel as M


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _row_ke_berita(row: M.Berita, tag_ids: list[int] | None = None) -> E.Berita:
    return E.Berita(
        id=row.id,
        desa_id=row.desa_id,
        penulis_id=row.penulis_id,
        slug=row.slug,
        judul=row.judul,
        ringkasan=row.ringkasan,
        konten=row.konten or "",
        sampul_media_id=row.sampul_media_id,
        kategori=row.kategori,
        status=row.status,
        terbit_pada=row.terbit_pada,
        sorotan=row.sorotan,
        tag_ids=tag_ids or [],
        dihapus_pada=row.dihapus_pada,
        urut=row.urut,
        dibuat_pada=row.dibuat_pada,
        diperbarui_pada=row.diperbarui_pada,
    )


async def _tag_ids_berita(s: AsyncSession, berita_id: UUID) -> list[int]:
    res = await s.execute(
        select(M.BeritaTag.tag_id).where(M.BeritaTag.berita_id == berita_id)
    )
    return list(res.scalars().all())


class RepoBeritaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, b: E.Berita) -> E.Berita:
        row = await self.s.get(M.Berita, b.id)
        if row is None:
            row = M.Berita(
                id=b.id,
                desa_id=b.desa_id,
                penulis_id=b.penulis_id,
                slug=b.slug,
                judul=b.judul,
                ringkasan=b.ringkasan,
                konten=b.konten,
                sampul_media_id=b.sampul_media_id,
                kategori=b.kategori,
                status=b.status,
                terbit_pada=b.terbit_pada,
                sorotan=b.sorotan,
                dihapus_pada=b.dihapus_pada,
            )
            self.s.add(row)
        else:
            row.slug = b.slug
            row.judul = b.judul
            row.ringkasan = b.ringkasan
            row.konten = b.konten
            row.sampul_media_id = b.sampul_media_id
            row.kategori = b.kategori
            row.status = b.status
            row.terbit_pada = b.terbit_pada
            row.sorotan = b.sorotan
            row.dihapus_pada = b.dihapus_pada
            row.diperbarui_pada = b.diperbarui_pada or _now()
        try:
            await self.s.flush()
        except IntegrityError:
            raise Konflik(
                "slug berita sudah dipakai di desa ini",
                [{"field": "slug", "pesan": "duplikat"}],
            )
        b.tag_ids = await _tag_ids_berita(self.s, b.id)
        return b

    async def ambil(self, id_: UUID) -> Optional[E.Berita]:
        row = await self.s.get(M.Berita, id_)
        if row is None:
            return None
        return _row_ke_berita(row, await _tag_ids_berita(self.s, id_))

    async def ambil_slug(self, desa_id: UUID, slug: str) -> Optional[E.Berita]:
        res = await self.s.execute(
            select(M.Berita).where(
                M.Berita.desa_id == desa_id,
                M.Berita.slug == slug,
                M.Berita.dihapus_pada.is_(None),
            )
        )
        row = res.scalar_one_or_none()
        if row is None:
            return None
        return _row_ke_berita(row, await _tag_ids_berita(self.s, row.id))

    async def daftar(self, desa_id: UUID) -> list[E.Berita]:
        res = await self.s.execute(select(M.Berita).where(M.Berita.desa_id == desa_id))
        rows = list(res.scalars().all())
        out = []
        for row in rows:
            out.append(_row_ke_berita(row, await _tag_ids_berita(self.s, row.id)))
        return out

    async def tempel_tag(self, berita_id: UUID, tag_id: int) -> None:
        self.s.add(M.BeritaTag(berita_id=berita_id, tag_id=tag_id))
        try:
            await self.s.flush()
        except IntegrityError:
            pass

    async def lepas_tag(self, berita_id: UUID, tag_id: int) -> None:
        await self.s.execute(
            text("DELETE FROM berita_tag WHERE berita_id = :b AND tag_id = :t"),
            {"b": berita_id, "t": tag_id},
        )


def _row_ke_peristiwa(row: M.Peristiwa) -> E.Peristiwa:
    muatan = row.muatan if isinstance(row.muatan, dict) else {}
    return E.Peristiwa(
        id=row.id,
        desa_id=row.desa_id,
        jenis=row.jenis,
        entitas_tipe=row.entitas_tipe,
        entitas_id=row.entitas_id,
        muatan=muatan,
        diproses_pada=row.diproses_pada,
        urut=row.urut,
        dibuat_pada=row.dibuat_pada,
    )


class RepoPeristiwaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, p: E.Peristiwa) -> E.Peristiwa:
        row = M.Peristiwa(
            id=p.id,
            desa_id=p.desa_id,
            jenis=p.jenis,
            entitas_tipe=p.entitas_tipe,
            entitas_id=p.entitas_id,
            muatan=p.muatan,
            diproses_pada=p.diproses_pada,
        )
        self.s.add(row)
        await self.s.flush()
        return p

    async def ambil(self, id_: UUID) -> Optional[E.Peristiwa]:
        row = await self.s.get(M.Peristiwa, id_)
        return _row_ke_peristiwa(row) if row else None

    async def belum_diproses(self, batas: int = 50) -> list[E.Peristiwa]:
        res = await self.s.execute(
            select(M.Peristiwa)
            .where(M.Peristiwa.diproses_pada.is_(None))
            .order_by(M.Peristiwa.dibuat_pada)
            .limit(batas)
        )
        return [_row_ke_peristiwa(r) for r in res.scalars().all()]

    async def tandai_diproses(self, id_: UUID) -> None:
        await self.s.execute(
            update(M.Peristiwa).where(M.Peristiwa.id == id_).values(diproses_pada=_now())
        )

    async def cari(self, **kwargs) -> list[E.Peristiwa]:
        q = select(M.Peristiwa)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.Peristiwa, k) == v)
        res = await self.s.execute(q)
        return [_row_ke_peristiwa(r) for r in res.scalars().all()]


def _row_ke_notifikasi(row: M.Notifikasi) -> E.Notifikasi:
    return E.Notifikasi(
        id=row.id,
        desa_id=row.desa_id,
        penerima_id=row.penerima_id,
        peristiwa_id=row.peristiwa_id,
        tipe=row.tipe,
        judul=row.judul,
        isi=row.isi,
        entitas_tipe=row.entitas_tipe,
        entitas_id=row.entitas_id,
        kanal=row.kanal,
        status=row.status,
        dibaca_pada=row.dibaca_pada,
        urut=row.urut,
        dibuat_pada=row.dibuat_pada,
    )


class RepoNotifikasiSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah_idempoten(self, n: E.Notifikasi) -> bool:
        stmt = (
            insert(M.Notifikasi)
            .values(
                id=n.id or uuid4(),
                desa_id=n.desa_id,
                penerima_id=n.penerima_id,
                peristiwa_id=n.peristiwa_id,
                tipe=n.tipe,
                judul=n.judul,
                isi=n.isi,
                entitas_tipe=n.entitas_tipe,
                entitas_id=n.entitas_id,
                kanal=n.kanal,
                status=n.status,
            )
            .on_conflict_do_nothing(constraint="uq_notifikasi_peristiwa_penerima_tipe")
        )
        res = await self.s.execute(stmt)
        return res.rowcount > 0

    async def ambil(self, id_: UUID) -> Optional[E.Notifikasi]:
        row = await self.s.get(M.Notifikasi, id_)
        return _row_ke_notifikasi(row) if row else None

    async def daftar_inbox(
        self,
        desa_id: UUID,
        penerima_id: UUID,
        *,
        status: str | None = None,
    ) -> list[E.Notifikasi]:
        q = select(M.Notifikasi).where(
            M.Notifikasi.desa_id == desa_id,
            M.Notifikasi.penerima_id == penerima_id,
        )
        if status is not None:
            q = q.where(M.Notifikasi.status == status)
        res = await self.s.execute(q)
        return [_row_ke_notifikasi(r) for r in res.scalars().all()]

    async def hitung_belum_dibaca(self, desa_id: UUID, penerima_id: UUID) -> int:
        rows = await self.daftar_inbox(desa_id, penerima_id, status="belum_dibaca")
        return len(rows)

    async def tandai_dibaca(self, id_: UUID, penerima_id: UUID) -> Optional[E.Notifikasi]:
        row = await self.s.get(M.Notifikasi, id_)
        if row is None or row.penerima_id != penerima_id:
            return None
        row.status = "dibaca"
        row.dibaca_pada = _now()
        await self.s.flush()
        return _row_ke_notifikasi(row)

    async def tandai_semua_dibaca(self, desa_id: UUID, penerima_id: UUID) -> int:
        res = await self.s.execute(
            update(M.Notifikasi)
            .where(
                M.Notifikasi.desa_id == desa_id,
                M.Notifikasi.penerima_id == penerima_id,
                M.Notifikasi.status == "belum_dibaca",
            )
            .values(status="dibaca", dibaca_pada=_now())
        )
        return res.rowcount or 0
