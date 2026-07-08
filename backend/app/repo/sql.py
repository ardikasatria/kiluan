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

from sqlalchemy import event, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..domain import entitas as E
from ..domain.enums import StatusKonten
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


# --- Geo helpers (PostGIS) ---

async def _set_lokasi_destinasi(s: AsyncSession, destinasi_id: UUID, lat: float, lng: float) -> None:
    await s.execute(
        text(
            "UPDATE destinasi SET lokasi = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography "
            "WHERE id = :id"
        ),
        {"lat": lat, "lng": lng, "id": destinasi_id},
    )


async def _baca_lokasi_destinasi(s: AsyncSession, destinasi_id: UUID) -> tuple[float, float]:
    res = await s.execute(
        text(
            "SELECT ST_Y(lokasi::geometry) AS lat, ST_X(lokasi::geometry) AS lng "
            "FROM destinasi WHERE id = :id"
        ),
        {"id": destinasi_id},
    )
    row = res.one()
    return (float(row.lat), float(row.lng))


async def _baca_lokasi_desa(s: AsyncSession, desa_id: UUID) -> tuple[float, float] | None:
    res = await s.execute(
        text(
            "SELECT ST_Y(lokasi::geometry) AS lat, ST_X(lokasi::geometry) AS lng "
            "FROM desa WHERE id = :id AND lokasi IS NOT NULL"
        ),
        {"id": desa_id},
    )
    row = res.one_or_none()
    return (float(row.lat), float(row.lng)) if row else None


async def _isi_lokasi_destinasi(s: AsyncSession, row: M.Destinasi) -> None:
    row.lokasi = await _baca_lokasi_destinasi(s, row.id)
    row._lokasi_baru = False


async def _isi_tag_destinasi(s: AsyncSession, row: M.Destinasi) -> None:
    res = await s.execute(
        select(M.Tag.kode)
        .join(M.DestinasiTag, M.DestinasiTag.tag_id == M.Tag.id)
        .where(M.DestinasiTag.destinasi_id == row.id)
    )
    row.tag_kode = list(res.scalars().all())


def _sinkron_lokasi_sebelum_flush(session, flush_context, instances) -> None:
    for obj in session.dirty:
        if isinstance(obj, M.Destinasi) and getattr(obj, "_lokasi_baru", False):
            lat, lng = obj.lokasi
            session.execute(
                text(
                    "UPDATE destinasi SET lokasi = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography "
                    "WHERE id = :id"
                ),
                {"lat": lat, "lng": lng, "id": obj.id},
            )
            obj._lokasi_baru = False


event.listen(AsyncSession.sync_session_class, "before_flush", _sinkron_lokasi_sebelum_flush)


class RepoKategoriSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, k: E.Kategori) -> E.Kategori:
        row = M.Kategori(id=k.id, kode=k.kode, nama=k.nama, ikon=k.ikon, urutan=k.urutan)
        self.s.add(row)
        await self.s.flush()
        return k

    async def ambil(self, id: int) -> Optional[M.Kategori]:
        return await self.s.get(M.Kategori, id)


class RepoTagSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, t: E.Tag) -> E.Tag:
        row = M.Tag(id=t.id, desa_id=t.desa_id, kode=t.kode, nama=t.nama)
        self.s.add(row)
        await self.s.flush()
        return t

    async def daftar(self, desa_id: UUID) -> list[M.Tag]:
        res = await self.s.execute(
            select(M.Tag).where((M.Tag.desa_id.is_(None)) | (M.Tag.desa_id == desa_id))
        )
        return list(res.scalars().all())

    async def ambil(self, id: int) -> Optional[M.Tag]:
        return await self.s.get(M.Tag, id)


class RepoDestinasiSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, d: E.Destinasi) -> M.Destinasi:
        row = M.Destinasi(
            id=d.id, desa_id=d.desa_id, slug=d.slug, nama=d.nama, deskripsi=d.deskripsi,
            kategori_id=d.kategori_id, alamat=d.alamat, jam_operasional=d.jam_operasional,
            status=_v(d.status), dibuat_oleh=d.dibuat_oleh, dihapus_pada=d.dihapus_pada,
        )
        self.s.add(row)
        try:
            await self.s.flush()
        except IntegrityError:
            raise Konflik(
                "slug destinasi sudah dipakai di desa ini",
                [{"field": "slug", "pesan": "duplikat"}],
            )
        await _set_lokasi_destinasi(self.s, row.id, d.lokasi[0], d.lokasi[1])
        await _isi_lokasi_destinasi(self.s, row)
        row.tag_kode = []
        return row

    async def ambil(self, id: UUID) -> Optional[M.Destinasi]:
        row = await self.s.get(M.Destinasi, id)
        if row is None:
            return None
        await _isi_lokasi_destinasi(self.s, row)
        await _isi_tag_destinasi(self.s, row)
        return row

    async def ambil_slug(self, desa_id: UUID, slug: str) -> Optional[M.Destinasi]:
        res = await self.s.execute(
            select(M.Destinasi).where(
                M.Destinasi.desa_id == desa_id,
                M.Destinasi.slug == slug,
                M.Destinasi.dihapus_pada.is_(None),
            )
        )
        row = res.scalar_one_or_none()
        if row is None:
            return None
        await _isi_lokasi_destinasi(self.s, row)
        await _isi_tag_destinasi(self.s, row)
        return row

    async def daftar(self, desa_id: UUID) -> list[M.Destinasi]:
        res = await self.s.execute(select(M.Destinasi).where(M.Destinasi.desa_id == desa_id))
        rows = list(res.scalars().all())
        for row in rows:
            await _isi_lokasi_destinasi(self.s, row)
            await _isi_tag_destinasi(self.s, row)
        return rows

    async def semua_desa_aktif(self, desa_aktif: set[UUID]) -> list[M.Destinasi]:
        if not desa_aktif:
            return []
        res = await self.s.execute(select(M.Destinasi).where(M.Destinasi.desa_id.in_(desa_aktif)))
        rows = list(res.scalars().all())
        for row in rows:
            await _isi_lokasi_destinasi(self.s, row)
            await _isi_tag_destinasi(self.s, row)
        return rows

    async def cari_dekat(
        self,
        desa_id: UUID,
        *,
        lat: float,
        lng: float,
        radius_m: float | None,
        publik: bool,
        kategori_id: int | None = None,
        tag: str | None = None,
        q: str | None = None,
        batas: int = 20,
    ) -> dict:
        clauses = ["d.desa_id = :desa_id", "d.dihapus_pada IS NULL"]
        params: dict = {"desa_id": desa_id, "lat": lat, "lng": lng, "batas": batas}
        if publik:
            clauses.append("d.status = :publikasi")
            params["publikasi"] = _v(StatusKonten.publikasi)
        if kategori_id is not None:
            clauses.append("d.kategori_id = :kategori_id")
            params["kategori_id"] = kategori_id
        if q:
            clauses.append("(LOWER(d.nama) LIKE :q OR LOWER(COALESCE(d.deskripsi, '')) LIKE :q)")
            params["q"] = f"%{q.lower()}%"
        join_tag = ""
        if tag is not None:
            join_tag = (
                " JOIN destinasi_tag dt ON dt.destinasi_id = d.id"
                " JOIN tag tg ON tg.id = dt.tag_id AND tg.kode = :tag"
            )
            params["tag"] = tag
        radius_sql = ""
        if radius_m is not None:
            radius_sql = (
                " AND ST_DWithin(d.lokasi, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)"
            )
            params["radius_m"] = radius_m
        sql = f"""
            SELECT d.id,
                   ST_Distance(d.lokasi, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS jarak_m
            FROM destinasi d
            {join_tag}
            WHERE {' AND '.join(clauses)}
            {radius_sql}
            ORDER BY jarak_m
            LIMIT :batas
        """
        res = await self.s.execute(text(sql), params)
        hasil: list[tuple[M.Destinasi, float]] = []
        for rid, jarak_m in res.all():
            row = await self.ambil(rid)
            if row:
                hasil.append((row, float(jarak_m)))
        item = [{"destinasi": d, "jarak_m": round(jm, 1)} for d, jm in hasil]
        return {
            "item": item,
            "meta": {"kursor_berikutnya": None, "ada_lagi": len(hasil) >= batas, "batas": batas},
        }

    async def tempel_tag(self, destinasi_id: UUID, tag_ids: list[int]) -> None:
        for tid in tag_ids:
            self.s.add(M.DestinasiTag(destinasi_id=destinasi_id, tag_id=tid))
        try:
            await self.s.flush()
        except IntegrityError:
            pass

    async def lepas_tag(self, destinasi_id: UUID, tag_id: int) -> None:
        await self.s.execute(
            text("DELETE FROM destinasi_tag WHERE destinasi_id = :d AND tag_id = :t"),
            {"d": destinasi_id, "t": tag_id},
        )


class RepoLayananSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, l: E.Layanan) -> M.Layanan:
        row = M.Layanan(
            id=l.id, desa_id=l.desa_id, destinasi_id=l.destinasi_id, nama=l.nama,
            jenis=_v(l.jenis), deskripsi=l.deskripsi, harga=l.harga,
            satuan_harga=_v(l.satuan_harga), ketersediaan=l.ketersediaan,
            penyedia_id=l.penyedia_id, status=_v(l.status), dihapus_pada=l.dihapus_pada,
        )
        self.s.add(row)
        await self.s.flush()
        return row

    async def ambil(self, id: UUID) -> Optional[M.Layanan]:
        return await self.s.get(M.Layanan, id)

    async def daftar(self, desa_id: UUID) -> list[M.Layanan]:
        res = await self.s.execute(select(M.Layanan).where(M.Layanan.desa_id == desa_id))
        return list(res.scalars().all())


class RepoKalenderSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, row: M.KalenderAktivitas) -> M.KalenderAktivitas:
        self.s.add(row)
        await self.s.flush()
        return row

    async def ambil(self, id: UUID) -> Optional[M.KalenderAktivitas]:
        return await self.s.get(M.KalenderAktivitas, id)

    async def daftar(self, desa_id: UUID) -> list[M.KalenderAktivitas]:
        res = await self.s.execute(
            select(M.KalenderAktivitas).where(M.KalenderAktivitas.desa_id == desa_id)
        )
        return list(res.scalars().all())

    async def hapus(self, id: UUID) -> None:
        row = await self.ambil(id)
        if row:
            await self.s.delete(row)


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
        self.kategori = RepoKategoriSQL(sesi)
        self.tag = RepoTagSQL(sesi)
        self.destinasi = RepoDestinasiSQL(sesi)
        self.layanan = RepoLayananSQL(sesi)
        self.kalender = RepoKalenderSQL(sesi)
