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

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import event, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..domain import entitas as E
from ..domain.enums import StatusKonten
from ..domain.errors import Konflik
from ..inti.minio import penyimpanan_objek
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
        row = res.scalar_one_or_none()
        if row is not None:
            row.lokasi = await _baca_lokasi_desa(self.s, row.id)
        return row

    async def daftar_aktif(self) -> list[M.Desa]:
        res = await self.s.execute(select(M.Desa).where(M.Desa.status == "aktif"))
        rows = list(res.scalars().all())
        for row in rows:
            row.lokasi = await _baca_lokasi_desa(self.s, row.id)
        return rows


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


class RepoMediaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, m: E.Media) -> M.Media:
        row = M.Media(
            id=m.id,
            desa_id=m.desa_id,
            objek_minio=m.objek_minio,
            url=m.url,
            tipe=_v(m.tipe),
            mime=m.mime,
            ukuran=m.ukuran,
            lebar=m.lebar,
            tinggi=m.tinggi,
            alt=m.alt,
            diunggah_oleh=m.diunggah_oleh,
        )
        self.s.add(row)
        try:
            await self.s.flush()
        except IntegrityError:
            raise Konflik(
                "objek_minio sudah dipakai",
                [{"field": "objek_minio", "pesan": "duplikat"}],
            )
        return row

    async def ambil(self, id: UUID) -> Optional[M.Media]:
        return await self.s.get(M.Media, id)

    async def hapus(self, id: UUID) -> None:
        row = await self.ambil(id)
        if row:
            await self.s.delete(row)


class RepoLampiranSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def tambah(self, l: E.Lampiran) -> M.MediaLampiran:
        row = M.MediaLampiran(
            id=l.id,
            media_id=l.media_id,
            entitas_tipe=_v(l.entitas_tipe),
            entitas_id=l.entitas_id,
            urutan=l.urutan,
            utama=l.utama,
        )
        self.s.add(row)
        await self.s.flush()
        return row

    async def ambil(self, id: UUID) -> Optional[M.MediaLampiran]:
        return await self.s.get(M.MediaLampiran, id)

    async def daftar_entitas(self, entitas_tipe, entitas_id: UUID) -> list[M.MediaLampiran]:
        res = await self.s.execute(
            select(M.MediaLampiran).where(
                M.MediaLampiran.entitas_tipe == _v(entitas_tipe),
                M.MediaLampiran.entitas_id == entitas_id,
            )
        )
        return list(res.scalars().all())

    async def hapus(self, id: UUID) -> None:
        row = await self.ambil(id)
        if row:
            await self.s.delete(row)


class RepoBidangUsahaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def daftar(self) -> list[M.BidangUsaha]:
        res = await self.s.execute(select(M.BidangUsaha).order_by(M.BidangUsaha.id))
        return list(res.scalars().all())

    async def ambil(self, id: int) -> Optional[M.BidangUsaha]:
        return await self.s.get(M.BidangUsaha, id)


async def _set_lokasi_umkm(s: AsyncSession, umkm_id: UUID, lat: float, lng: float) -> None:
    await s.execute(
        text(
            "UPDATE umkm SET lokasi = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography "
            "WHERE id = :id"
        ),
        {"lat": lat, "lng": lng, "id": umkm_id},
    )


async def _baca_lokasi_umkm(s: AsyncSession, umkm_id: UUID) -> tuple[float, float] | None:
    res = await s.execute(
        text(
            "SELECT ST_Y(lokasi::geometry) AS lat, ST_X(lokasi::geometry) AS lng "
            "FROM umkm WHERE id = :id AND lokasi IS NOT NULL"
        ),
        {"id": umkm_id},
    )
    row = res.one_or_none()
    return (float(row.lat), float(row.lng)) if row else None


def _row_ke_umkm(row: M.Umkm, lokasi: tuple[float, float] | None) -> E.Umkm:
    return E.Umkm(
        id=row.id,
        desa_id=row.desa_id,
        pengguna_id=row.pengguna_id,
        bidang_id=row.bidang_id,
        nama=row.nama,
        deskripsi=row.deskripsi or "",
        telepon=row.telepon or "",
        whatsapp=row.whatsapp or "",
        alamat=row.alamat or "",
        lokasi=lokasi,
        status_verifikasi=row.status_verifikasi,
        diverifikasi_oleh=row.diverifikasi_oleh,
        urut=int(row.dibuat_pada.timestamp()) if row.dibuat_pada else 0,
        dibuat_pada=row.dibuat_pada,
        diperbarui_pada=row.diperbarui_pada,
        dihapus_pada=row.dihapus_pada,
    )


class RepoUmkmSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, u: E.Umkm) -> E.Umkm:
        row = await self.s.get(M.Umkm, u.id)
        if row is None:
            row = M.Umkm(
                id=u.id,
                desa_id=u.desa_id,
                pengguna_id=u.pengguna_id,
                bidang_id=u.bidang_id,
                nama=u.nama,
                deskripsi=u.deskripsi,
                telepon=u.telepon,
                whatsapp=u.whatsapp,
                alamat=u.alamat,
                status_verifikasi=u.status_verifikasi,
                diverifikasi_oleh=u.diverifikasi_oleh,
                dihapus_pada=u.dihapus_pada,
            )
            self.s.add(row)
        else:
            row.nama = u.nama
            row.deskripsi = u.deskripsi
            row.telepon = u.telepon
            row.whatsapp = u.whatsapp
            row.alamat = u.alamat
            row.bidang_id = u.bidang_id
            row.status_verifikasi = u.status_verifikasi
            row.diverifikasi_oleh = u.diverifikasi_oleh
            row.dihapus_pada = u.dihapus_pada
            row.diperbarui_pada = u.diperbarui_pada or _now()
        await self.s.flush()
        if u.lokasi:
            await _set_lokasi_umkm(self.s, u.id, u.lokasi[0], u.lokasi[1])
        return u

    async def ambil(self, id: UUID) -> Optional[E.Umkm]:
        row = await self.s.get(M.Umkm, id)
        if row is None:
            return None
        lok = await _baca_lokasi_umkm(self.s, row.id)
        return _row_ke_umkm(row, lok)

    async def cari(self, **kwargs) -> list[E.Umkm]:
        q = select(M.Umkm)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.Umkm, k) == v)
        res = await self.s.execute(q)
        hasil = []
        for row in res.scalars().all():
            lok = await _baca_lokasi_umkm(self.s, row.id)
            hasil.append(_row_ke_umkm(row, lok))
        return hasil

    async def daftar(self, desa_id: UUID) -> list[E.Umkm]:
        return await self.cari(desa_id=desa_id)


def _row_ke_produk(row: M.ProdukJasa) -> E.ProdukJasa:
    return E.ProdukJasa(
        id=row.id,
        desa_id=row.desa_id,
        umkm_id=row.umkm_id,
        nama=row.nama,
        jenis=row.jenis,
        harga=row.harga,
        satuan_harga=row.satuan_harga,
        deskripsi=row.deskripsi or "",
        stok=row.stok,
        status=row.status,
        urut=int(row.dibuat_pada.timestamp()) if row.dibuat_pada else 0,
        dibuat_pada=row.dibuat_pada,
        diperbarui_pada=row.diperbarui_pada,
        dihapus_pada=row.dihapus_pada,
    )


class RepoProdukJasaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, p: E.ProdukJasa) -> E.ProdukJasa:
        row = await self.s.get(M.ProdukJasa, p.id)
        if row is None:
            row = M.ProdukJasa(
                id=p.id,
                desa_id=p.desa_id,
                umkm_id=p.umkm_id,
                nama=p.nama,
                jenis=p.jenis,
                harga=p.harga,
                satuan_harga=p.satuan_harga,
                deskripsi=p.deskripsi,
                stok=p.stok,
                status=p.status,
                dihapus_pada=p.dihapus_pada,
            )
            self.s.add(row)
        else:
            row.nama = p.nama
            row.deskripsi = p.deskripsi
            row.harga = p.harga
            row.stok = p.stok
            row.status = p.status
            row.dihapus_pada = p.dihapus_pada
            row.diperbarui_pada = p.diperbarui_pada or _now()
        await self.s.flush()
        return p

    async def ambil(self, id: UUID) -> Optional[E.ProdukJasa]:
        row = await self.s.get(M.ProdukJasa, id)
        return _row_ke_produk(row) if row else None

    async def cari(self, **kwargs) -> list[E.ProdukJasa]:
        q = select(M.ProdukJasa)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.ProdukJasa, k) == v)
        res = await self.s.execute(q)
        return [_row_ke_produk(r) for r in res.scalars().all()]

    async def daftar(self, desa_id: UUID) -> list[E.ProdukJasa]:
        return await self.cari(desa_id=desa_id)


def _row_ke_paket(row: M.PaketWisata) -> E.PaketWisata:
    return E.PaketWisata(
        id=row.id,
        desa_id=row.desa_id,
        agen_id=row.agen_id,
        slug=row.slug,
        nama=row.nama,
        durasi_jam=row.durasi_jam,
        harga=row.harga,
        satuan_harga=row.satuan_harga,
        deskripsi=row.deskripsi or "",
        kuota_default=row.kuota_default,
        status=row.status,
        urut=int(row.dibuat_pada.timestamp()) if row.dibuat_pada else 0,
        dibuat_pada=row.dibuat_pada,
        diperbarui_pada=row.diperbarui_pada,
        dihapus_pada=row.dihapus_pada,
    )


class RepoPaketWisataSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, p: E.PaketWisata) -> E.PaketWisata:
        row = await self.s.get(M.PaketWisata, p.id)
        if row is None:
            row = M.PaketWisata(
                id=p.id,
                desa_id=p.desa_id,
                agen_id=p.agen_id,
                slug=p.slug,
                nama=p.nama,
                durasi_jam=p.durasi_jam,
                harga=p.harga,
                satuan_harga=p.satuan_harga,
                deskripsi=p.deskripsi,
                kuota_default=p.kuota_default,
                status=p.status,
                dihapus_pada=p.dihapus_pada,
            )
            self.s.add(row)
        else:
            row.nama = p.nama
            row.deskripsi = p.deskripsi
            row.durasi_jam = p.durasi_jam
            row.harga = p.harga
            row.kuota_default = p.kuota_default
            row.status = p.status
            row.dihapus_pada = p.dihapus_pada
            row.diperbarui_pada = p.diperbarui_pada or _now()
        try:
            await self.s.flush()
        except IntegrityError:
            raise Konflik("Slug paket sudah dipakai di desa ini.")
        return p

    async def ambil(self, id: UUID) -> Optional[E.PaketWisata]:
        row = await self.s.get(M.PaketWisata, id)
        return _row_ke_paket(row) if row else None

    async def cari(self, **kwargs) -> list[E.PaketWisata]:
        q = select(M.PaketWisata)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.PaketWisata, k) == v)
        res = await self.s.execute(q)
        return [_row_ke_paket(r) for r in res.scalars().all()]

    async def daftar(self, desa_id: UUID) -> list[E.PaketWisata]:
        return await self.cari(desa_id=desa_id)

    async def ambil_slug(self, desa_id: UUID, slug: str) -> E.PaketWisata | None:
        for p in await self.cari(desa_id=desa_id, slug=slug):
            if p.dihapus_pada is None:
                return p
        return None


class RepoPaketItemSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, i: E.PaketItem) -> E.PaketItem:
        row = await self.s.get(M.PaketItem, i.id)
        if row is None:
            row = M.PaketItem(
                id=i.id,
                paket_id=i.paket_id,
                hari=i.hari,
                urutan=i.urutan,
                judul=i.judul,
                deskripsi=i.deskripsi,
                destinasi_id=i.destinasi_id,
                layanan_id=i.layanan_id,
                produk_jasa_id=i.produk_jasa_id,
                durasi_menit=i.durasi_menit,
            )
            self.s.add(row)
        else:
            row.hari = i.hari
            row.urutan = i.urutan
            row.judul = i.judul
            row.deskripsi = i.deskripsi
            row.durasi_menit = i.durasi_menit
        await self.s.flush()
        return i

    async def ambil(self, id: UUID) -> Optional[E.PaketItem]:
        row = await self.s.get(M.PaketItem, id)
        if row is None:
            return None
        return E.PaketItem(
            id=row.id,
            paket_id=row.paket_id,
            hari=row.hari,
            urutan=row.urutan,
            judul=row.judul or "",
            deskripsi=row.deskripsi or "",
            destinasi_id=row.destinasi_id,
            layanan_id=row.layanan_id,
            produk_jasa_id=row.produk_jasa_id,
            durasi_menit=row.durasi_menit,
        )

    async def cari(self, **kwargs) -> list[E.PaketItem]:
        q = select(M.PaketItem)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.PaketItem, k) == v)
        res = await self.s.execute(q)
        return [
            E.PaketItem(
                id=r.id, paket_id=r.paket_id, hari=r.hari, urutan=r.urutan,
                judul=r.judul or "", deskripsi=r.deskripsi or "",
                destinasi_id=r.destinasi_id, layanan_id=r.layanan_id,
                produk_jasa_id=r.produk_jasa_id, durasi_menit=r.durasi_menit,
            )
            for r in res.scalars().all()
        ]

    async def daftar_paket(self, paket_id: UUID) -> list[E.PaketItem]:
        return sorted(await self.cari(paket_id=paket_id), key=lambda i: (i.hari, i.urutan))

    async def hapus(self, id_: UUID) -> None:
        row = await self.s.get(M.PaketItem, id_)
        if row:
            await self.s.delete(row)


class RepoKurasiLogSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, log: E.KurasiLog) -> E.KurasiLog:
        row = M.KurasiLog(
            id=log.id,
            entitas_tipe=log.entitas_tipe,
            entitas_id=log.entitas_id,
            dari_status=log.dari_status,
            ke_status=log.ke_status,
            kurator_id=log.kurator_id,
            keputusan=log.keputusan,
            catatan=log.catatan,
        )
        self.s.add(row)
        await self.s.flush()
        return log

    async def cari(self, **kwargs) -> list[E.KurasiLog]:
        q = select(M.KurasiLog)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.KurasiLog, k) == v)
        res = await self.s.execute(q)
        return [
            E.KurasiLog(
                id=r.id, entitas_tipe=r.entitas_tipe, entitas_id=r.entitas_id,
                dari_status=r.dari_status, ke_status=r.ke_status,
                kurator_id=r.kurator_id, keputusan=r.keputusan, catatan=r.catatan or "",
                urut=int(r.dibuat_pada.timestamp()) if r.dibuat_pada else 0,
                dibuat_pada=r.dibuat_pada,
            )
            for r in res.scalars().all()
        ]

    async def hitung(self) -> int:
        res = await self.s.execute(select(M.KurasiLog))
        return len(res.scalars().all())


def _row_ke_kontribusi(row: M.Kontribusi) -> E.Kontribusi:
    muatan = row.muatan if isinstance(row.muatan, dict) else {}
    return E.Kontribusi(
        id=row.id,
        desa_id=row.desa_id,
        penyumbang_id=row.penyumbang_id,
        tipe=row.tipe,
        target_tipe=row.target_tipe,
        target_id=row.target_id,
        muatan=muatan,
        media_id=row.media_id,
        status=row.status,
        urut=int(row.dibuat_pada.timestamp()) if row.dibuat_pada else 0,
        dibuat_pada=row.dibuat_pada,
        diperbarui_pada=row.diperbarui_pada,
    )


class RepoKontribusiSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, k: E.Kontribusi) -> E.Kontribusi:
        row = await self.s.get(M.Kontribusi, k.id)
        if row is None:
            row = M.Kontribusi(
                id=k.id,
                desa_id=k.desa_id,
                penyumbang_id=k.penyumbang_id,
                tipe=k.tipe,
                target_tipe=k.target_tipe,
                target_id=k.target_id,
                muatan=k.muatan,
                media_id=k.media_id,
                status=k.status,
            )
            self.s.add(row)
        else:
            row.muatan = k.muatan
            row.media_id = k.media_id
            row.status = k.status
            row.diperbarui_pada = k.diperbarui_pada or _now()
        await self.s.flush()
        return k

    async def ambil(self, id: UUID) -> Optional[E.Kontribusi]:
        row = await self.s.get(M.Kontribusi, id)
        return _row_ke_kontribusi(row) if row else None

    async def cari(self, **kwargs) -> list[E.Kontribusi]:
        q = select(M.Kontribusi)
        for key, val in kwargs.items():
            if val is not None:
                q = q.where(getattr(M.Kontribusi, key) == val)
        res = await self.s.execute(q)
        return [_row_ke_kontribusi(r) for r in res.scalars().all()]

    async def daftar(self, desa_id: UUID) -> list[E.Kontribusi]:
        return await self.cari(desa_id=desa_id)


class RepoKartuAksiSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def ambil(self, id_: int) -> Optional[E.KartuAksi]:
        row = await self.s.get(M.KartuAksi, id_)
        return _row_ke_kartu(row) if row else None

    async def semua(self) -> list[E.KartuAksi]:
        res = await self.s.execute(select(M.KartuAksi))
        return [_row_ke_kartu(r) for r in res.scalars().all()]

    async def daftar_aktif(self, desa_id: UUID) -> list[E.KartuAksi]:
        res = await self.s.execute(
            select(M.KartuAksi).where(
                M.KartuAksi.aktif.is_(True),
                (M.KartuAksi.desa_id == desa_id) | (M.KartuAksi.desa_id.is_(None)),
            )
        )
        return [_row_ke_kartu(r) for r in res.scalars().all()]


def _row_ke_kartu(row: M.KartuAksi) -> E.KartuAksi:
    bukti = row.bukti_dibutuhkan if isinstance(row.bukti_dibutuhkan, dict) else {}
    return E.KartuAksi(
        id=row.id,
        kode=row.kode,
        nama=row.nama,
        deskripsi=row.deskripsi or "",
        kenapa_penting=row.kenapa_penting or "",
        bukti_dibutuhkan=bukti,
        bobot=row.bobot,
        desa_id=row.desa_id,
        aktif=row.aktif,
    )


def _row_ke_pengajuan(row: M.PengajuanKartu) -> E.PengajuanKartu:
    bukti = row.bukti if isinstance(row.bukti, dict) else {}
    return E.PengajuanKartu(
        id=row.id,
        desa_id=row.desa_id,
        subjek_tipe=row.subjek_tipe,
        subjek_id=row.subjek_id,
        kartu_id=row.kartu_id,
        bukti=bukti,
        status=row.status,
        validator_id=row.validator_id,
        catatan=row.catatan or "",
        urut=int(row.dibuat_pada.timestamp()) if row.dibuat_pada else 0,
        dibuat_pada=row.dibuat_pada,
        divalidasi_pada=row.divalidasi_pada,
    )


def _row_ke_sertifikasi(row: M.SertifikasiOwner) -> E.SertifikasiOwner:
    return E.SertifikasiOwner(
        id=row.id,
        desa_id=row.desa_id,
        subjek_tipe=row.subjek_tipe,
        subjek_id=row.subjek_id,
        tingkat=row.tingkat,
        skor=row.skor,
        diperbarui_pada=row.diperbarui_pada,
    )


class RepoPengajuanKartuSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def simpan(self, p: E.PengajuanKartu) -> E.PengajuanKartu:
        row = await self.s.get(M.PengajuanKartu, p.id)
        if row is None:
            row = M.PengajuanKartu(
                id=p.id,
                desa_id=p.desa_id,
                subjek_tipe=p.subjek_tipe,
                subjek_id=p.subjek_id,
                kartu_id=p.kartu_id,
                bukti=p.bukti,
                status=p.status,
                validator_id=p.validator_id,
                catatan=p.catatan,
                divalidasi_pada=p.divalidasi_pada,
            )
            self.s.add(row)
        else:
            row.bukti = p.bukti
            row.status = p.status
            row.validator_id = p.validator_id
            row.catatan = p.catatan
            row.divalidasi_pada = p.divalidasi_pada
        await self.s.flush()
        return p

    async def ambil(self, id_: UUID) -> Optional[E.PengajuanKartu]:
        row = await self.s.get(M.PengajuanKartu, id_)
        return _row_ke_pengajuan(row) if row else None

    async def cari(self, **kwargs) -> list[E.PengajuanKartu]:
        q = select(M.PengajuanKartu)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.PengajuanKartu, k) == v)
        res = await self.s.execute(q)
        return [_row_ke_pengajuan(r) for r in res.scalars().all()]

    async def daftar(self, desa_id: UUID) -> list[E.PengajuanKartu]:
        res = await self.s.execute(
            select(M.PengajuanKartu).where(M.PengajuanKartu.desa_id == desa_id)
        )
        return [_row_ke_pengajuan(r) for r in res.scalars().all()]


class RepoSertifikasiOwnerSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def cari(
        self,
        *,
        desa_id: UUID | None = None,
        subjek_tipe: str | None = None,
        subjek_id: UUID | None = None,
    ) -> list[E.SertifikasiOwner]:
        q = select(M.SertifikasiOwner)
        if desa_id is not None:
            q = q.where(M.SertifikasiOwner.desa_id == desa_id)
        if subjek_tipe is not None:
            q = q.where(M.SertifikasiOwner.subjek_tipe == subjek_tipe)
        if subjek_id is not None:
            q = q.where(M.SertifikasiOwner.subjek_id == subjek_id)
        res = await self.s.execute(q)
        return [_row_ke_sertifikasi(r) for r in res.scalars().all()]

    async def upsert(self, sert: E.SertifikasiOwner) -> E.SertifikasiOwner:
        stmt = (
            insert(M.SertifikasiOwner)
            .values(
                id=sert.id,
                desa_id=sert.desa_id,
                subjek_tipe=sert.subjek_tipe,
                subjek_id=sert.subjek_id,
                tingkat=sert.tingkat,
                skor=sert.skor,
                diperbarui_pada=sert.diperbarui_pada or _now(),
            )
            .on_conflict_do_update(
                constraint="uq_sertifikasi_owner",
                set_={
                    "tingkat": sert.tingkat,
                    "skor": sert.skor,
                    "diperbarui_pada": sert.diperbarui_pada or _now(),
                },
            )
        )
        await self.s.execute(stmt)
        await self.s.flush()
        rows = await self.cari(
            desa_id=sert.desa_id,
            subjek_tipe=sert.subjek_tipe,
            subjek_id=sert.subjek_id,
        )
        return rows[0] if rows else sert


class RepoAturanPoinSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def cari(self, **kwargs) -> list[M.AturanPoin]:
        q = select(M.AturanPoin)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.AturanPoin, k) == v)
        res = await self.s.execute(q)
        return list(res.scalars().all())

    async def ambil_aturan(self, desa_id: UUID, kode_aksi: str) -> Optional[M.AturanPoin]:
        lokal = await self.cari(kode_aksi=kode_aksi, desa_id=desa_id, aktif=True)
        if lokal:
            return lokal[0]
        glob = await self.cari(kode_aksi=kode_aksi, desa_id=None, aktif=True)
        return glob[0] if glob else None

    async def daftar_aktif(self, desa_id: UUID) -> list[M.AturanPoin]:
        res = await self.s.execute(
            select(M.AturanPoin).where(
                M.AturanPoin.aktif.is_(True),
                (M.AturanPoin.desa_id == desa_id) | (M.AturanPoin.desa_id.is_(None)),
            )
        )
        return list(res.scalars().all())


class RepoTransaksiPoinSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def cari(self, **kwargs) -> list[M.TransaksiPoin]:
        q = select(M.TransaksiPoin)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.TransaksiPoin, k) == v)
        res = await self.s.execute(q)
        return list(res.scalars().all())

    async def daftar_desa(self, desa_id: UUID, pengguna_id: UUID | None = None) -> list[M.TransaksiPoin]:
        q = select(M.TransaksiPoin).where(M.TransaksiPoin.desa_id == desa_id)
        if pengguna_id is not None:
            q = q.where(M.TransaksiPoin.pengguna_id == pengguna_id)
        res = await self.s.execute(q)
        return list(res.scalars().all())

    async def award(
        self,
        desa_id: UUID,
        pengguna_id: UUID,
        aturan_id: int | None,
        kode_aksi: str,
        poin: int,
        referensi_tipe: str | None = None,
        referensi_id: UUID | None = None,
    ) -> bool:
        stmt = (
            insert(M.TransaksiPoin)
            .values(
                id=uuid4(),
                desa_id=desa_id,
                pengguna_id=pengguna_id,
                aturan_id=aturan_id,
                kode_aksi=kode_aksi,
                poin=poin,
                referensi_tipe=referensi_tipe,
                referensi_id=referensi_id,
            )
            .on_conflict_do_nothing(constraint="uq_transaksi_poin_award")
        )
        res = await self.s.execute(stmt)
        return res.rowcount > 0


class RepoBadgeSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def semua(self) -> list[M.Badge]:
        res = await self.s.execute(select(M.Badge))
        return list(res.scalars().all())

    async def daftar_aktif(self, desa_id: UUID) -> list[M.Badge]:
        res = await self.s.execute(
            select(M.Badge).where(
                M.Badge.aktif.is_(True),
                (M.Badge.desa_id == desa_id) | (M.Badge.desa_id.is_(None)),
            )
        )
        return list(res.scalars().all())


class RepoBadgePenggunaSQL:
    def __init__(self, s: AsyncSession):
        self.s = s

    async def cari(self, **kwargs) -> list[M.BadgePengguna]:
        q = select(M.BadgePengguna)
        for k, v in kwargs.items():
            if v is not None:
                q = q.where(getattr(M.BadgePengguna, k) == v)
        res = await self.s.execute(q)
        return list(res.scalars().all())

    async def tambah_idempoten(self, pengguna_id: UUID, badge_id: int) -> bool:
        stmt = (
            insert(M.BadgePengguna)
            .values(id=uuid4(), pengguna_id=pengguna_id, badge_id=badge_id)
            .on_conflict_do_nothing(constraint="uq_badge_pengguna")
        )
        res = await self.s.execute(stmt)
        return res.rowcount > 0

    async def daftar_milik(self, pengguna_id: UUID) -> list[M.BadgePengguna]:
        return await self.cari(pengguna_id=pengguna_id)


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
        self.media = RepoMediaSQL(sesi)
        self.lampiran = RepoLampiranSQL(sesi)
        self.bidang_usaha = RepoBidangUsahaSQL(sesi)
        self.aturan_poin = RepoAturanPoinSQL(sesi)
        self.transaksi_poin = RepoTransaksiPoinSQL(sesi)
        self.badge = RepoBadgeSQL(sesi)
        self.badge_pengguna = RepoBadgePenggunaSQL(sesi)
        self.umkm = RepoUmkmSQL(sesi)
        self.produk_jasa = RepoProdukJasaSQL(sesi)
        self.paket_wisata = RepoPaketWisataSQL(sesi)
        self.paket_item = RepoPaketItemSQL(sesi)
        self.kurasi_log = RepoKurasiLogSQL(sesi)
        self.kontribusi = RepoKontribusiSQL(sesi)
        self.kartu_aksi = RepoKartuAksiSQL(sesi)
        self.pengajuan_kartu = RepoPengajuanKartuSQL(sesi)
        self.sertifikasi_owner = RepoSertifikasiOwnerSQL(sesi)
        self.objek = penyimpanan_objek()
