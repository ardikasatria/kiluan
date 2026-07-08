"""Model SQLAlchemy 2.x — sumber kebenaran skema untuk Alembic.

CATATAN: file ini butuh `sqlalchemy` + `geoalchemy2` + PostgreSQL/PostGIS dan
TIDAK diimpor oleh test suite (yang berjalan murni in-memory). Ia jadi acuan
saat menulis migrasi bootstrap Alembic di brief Cursor B0. Nama tabel/kolom
mengikuti ERD_Kiluan_Fase0.md.
"""
from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, TIMESTAMP, UUID
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Peta peran_id <-> kode, konsisten dengan seed migrasi bootstrap 0001.
PERAN_ID: dict[str, int] = {
    "wisatawan": 1, "pokdarwis": 2, "umkm": 3, "agen": 4,
    "kontributor": 5, "organisasi": 6, "perangkat_desa": 7, "admin": 8,
}
ID_PERAN: dict[int, str] = {v: k for k, v in PERAN_ID.items()}

try:
    from geoalchemy2 import Geography
except Exception:  # pragma: no cover - hanya untuk lint tanpa geoalchemy2
    Geography = lambda *a, **k: String  # type: ignore


class Base(DeclarativeBase):
    pass


def _pk() -> Mapped[uuid.UUID]:
    # Di produksi default UUIDv7 (mis. via ekstensi / fungsi app). Placeholder uuid4.
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _ts_buat() -> Mapped[datetime]:
    return mapped_column(TIMESTAMP(timezone=True), server_default=func.now())


class Desa(Base):
    __tablename__ = "desa"
    id: Mapped[uuid.UUID] = _pk()
    slug: Mapped[str] = mapped_column(String, unique=True)
    nama: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    lokasi_geom = mapped_column("lokasi", Geography(geometry_type="POINT", srid=4326))
    provinsi: Mapped[str | None] = mapped_column(String)
    kabupaten: Mapped[str | None] = mapped_column(String)
    kecamatan: Mapped[str | None] = mapped_column(String)
    pekon: Mapped[str | None] = mapped_column(String)
    logo_media_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    warna_primer: Mapped[str | None] = mapped_column(String)
    kode_bmkg_adm4: Mapped[str | None] = mapped_column(String)
    kode_perairan_bmkg: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="draft")
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (CheckConstraint("status IN ('draft','aktif','nonaktif')"),)

    @property
    def lokasi(self) -> tuple[float, float] | None:
        """Cache (lat,lng) diisi repo; kolom geografi asli = `lokasi_geom`."""
        return getattr(self, "_lokasi_cache", None)

    @lokasi.setter
    def lokasi(self, v: tuple[float, float] | None) -> None:
        self._lokasi_cache = v

    @property
    def urut(self) -> int:
        if self.dibuat_pada is None:
            return 0
        return int(self.dibuat_pada.timestamp() * 1_000_000)


class Pengguna(Base):
    __tablename__ = "pengguna"
    id: Mapped[uuid.UUID] = _pk()
    email: Mapped[str] = mapped_column(String, unique=True)  # produksi: CITEXT
    nama: Mapped[str] = mapped_column(String)
    kata_sandi_hash: Mapped[str] = mapped_column(String)
    telepon: Mapped[str | None] = mapped_column(String)
    avatar_media_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    status: Mapped[str] = mapped_column(String, default="pending")
    email_terverifikasi_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    login_terakhir: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()


class Peran(Base):
    __tablename__ = "peran"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    kode: Mapped[str] = mapped_column(String, unique=True)
    nama: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    scoped_desa: Mapped[bool] = mapped_column(default=True)


class Keanggotaan(Base):
    __tablename__ = "keanggotaan"
    id: Mapped[uuid.UUID] = _pk()
    pengguna_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    desa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("desa.id"))  # null=global
    peran_id: Mapped[int] = mapped_column(ForeignKey("peran.id"))
    status: Mapped[str] = mapped_column(String, default="menunggu")
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (UniqueConstraint("pengguna_id", "desa_id", "peran_id"),)

    @hybrid_property
    def peran(self) -> str:
        """Kode peran (mis. 'pokdarwis') dari peran_id — dipakai layer domain."""
        return ID_PERAN.get(self.peran_id, "")

    @peran.inplace.setter
    def _set_peran(self, kode: str) -> None:
        self.peran_id = PERAN_ID[str(kode)]


class TokenAuth(Base):
    __tablename__ = "token_auth"
    id: Mapped[uuid.UUID] = _pk()
    pengguna_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    tipe: Mapped[str] = mapped_column(String)
    token_hash: Mapped[str] = mapped_column(String)
    kedaluwarsa_pada: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    dipakai_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    dibuat_pada: Mapped[datetime] = _ts_buat()


class Kategori(Base):
    __tablename__ = "kategori"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    kode: Mapped[str] = mapped_column(String, unique=True)
    nama: Mapped[str] = mapped_column(String)
    ikon: Mapped[str | None] = mapped_column(String)
    urutan: Mapped[int] = mapped_column(SmallInteger, default=0)


class Destinasi(Base):
    __tablename__ = "destinasi"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    slug: Mapped[str] = mapped_column(String)
    nama: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    kategori_id: Mapped[int] = mapped_column(ForeignKey("kategori.id"))
    lokasi_geom = mapped_column("lokasi", Geography(geometry_type="POINT", srid=4326))
    area = mapped_column(Geography(geometry_type="POLYGON", srid=4326), nullable=True)
    alamat: Mapped[str | None] = mapped_column(String)
    daya_dukung_harian: Mapped[int | None] = mapped_column(Integer)  # slot F3
    jam_operasional = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String, default="draft")
    dibuat_oleh: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pengguna.id"))
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    dihapus_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    __table_args__ = (UniqueConstraint("desa_id", "slug"),)

    @property
    def lokasi(self) -> tuple[float, float]:
        cache = getattr(self, "_lokasi_cache", None)
        return cache if cache is not None else (0.0, 0.0)

    @lokasi.setter
    def lokasi(self, v: tuple[float, float]) -> None:
        self._lokasi_cache = v
        self._lokasi_baru = True

    @property
    def tag_kode(self) -> list[str]:
        return getattr(self, "_tag_kode_cache", [])

    @tag_kode.setter
    def tag_kode(self, v: list[str]) -> None:
        self._tag_kode_cache = v

    @property
    def urut(self) -> int:
        if self.dibuat_pada is None:
            return 0
        return int(self.dibuat_pada.timestamp() * 1_000_000)


class Layanan(Base):
    __tablename__ = "layanan"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    destinasi_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("destinasi.id"))
    nama: Mapped[str] = mapped_column(String)
    jenis: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    harga: Mapped[float] = mapped_column()
    satuan_harga: Mapped[str] = mapped_column(String)
    ketersediaan = mapped_column(JSONB)
    penyedia_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pengguna.id"))
    # umkm_id ditambahkan saat F1 (Pasar Desa).
    status: Mapped[str] = mapped_column(String, default="draft")
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    dihapus_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    @property
    def urut(self) -> int:
        if self.dibuat_pada is None:
            return 0
        return int(self.dibuat_pada.timestamp() * 1_000_000)


class KalenderAktivitas(Base):
    __tablename__ = "kalender_aktivitas"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    destinasi_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("destinasi.id"))
    judul: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    tipe: Mapped[str] = mapped_column(String)
    waktu_mulai = mapped_column(sa.Time)
    waktu_selesai = mapped_column(sa.Time)
    pengulangan = mapped_column(JSONB)
    berlaku_mulai = mapped_column(sa.Date)
    berlaku_sampai = mapped_column(sa.Date)
    status: Mapped[str] = mapped_column(String, default="aktif")
    dibuat_pada: Mapped[datetime] = _ts_buat()


class Media(Base):
    __tablename__ = "media"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    objek_minio: Mapped[str] = mapped_column(String, unique=True)
    url: Mapped[str | None] = mapped_column(String)
    tipe: Mapped[str] = mapped_column(String)
    mime: Mapped[str | None] = mapped_column(String)
    ukuran: Mapped[int | None] = mapped_column(Integer)
    lebar: Mapped[int | None] = mapped_column(Integer)
    tinggi: Mapped[int | None] = mapped_column(Integer)
    alt: Mapped[str | None] = mapped_column(String)
    diunggah_oleh: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pengguna.id"))
    dibuat_pada: Mapped[datetime] = _ts_buat()

    @property
    def dikonfirmasi(self) -> bool:
        return self.url is not None


class MediaLampiran(Base):
    __tablename__ = "media_lampiran"
    id: Mapped[uuid.UUID] = _pk()
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media.id"))
    entitas_tipe: Mapped[str] = mapped_column(String)
    entitas_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))  # polimorfik, tanpa FK keras
    urutan: Mapped[int] = mapped_column(SmallInteger, default=0)
    utama: Mapped[bool] = mapped_column(default=False)


class Tag(Base):
    __tablename__ = "tag"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    desa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("desa.id"))  # null=global
    kode: Mapped[str] = mapped_column(String, unique=True)
    nama: Mapped[str] = mapped_column(String)


class DestinasiTag(Base):
    __tablename__ = "destinasi_tag"
    destinasi_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("destinasi.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tag.id"), primary_key=True)
