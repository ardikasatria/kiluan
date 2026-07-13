"""Model SQLAlchemy 2.x — sumber kebenaran skema untuk Alembic.

CATATAN: file ini butuh `sqlalchemy` + `geoalchemy2` + PostgreSQL/PostGIS dan
TIDAK diimpor oleh test suite (yang berjalan murni in-memory). Ia jadi acuan
saat menulis migrasi bootstrap Alembic di brief Cursor B0. Nama tabel/kolom
mengikuti ERD_Kiluan_Fase0.md.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, time
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
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
    umkm_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("umkm.id"))
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
    entitas_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    urutan: Mapped[int] = mapped_column(SmallInteger, default=0)
    utama: Mapped[bool] = mapped_column(default=False)
    __table_args__ = (
        CheckConstraint(
            "entitas_tipe IN ('destinasi','layanan','desa','pengguna',"
            "'umkm','produk_jasa','paket_wisata','kontribusi','berita')",
            name="ck_lampiran_entitas",
        ),
    )


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


# --- Fase 1 (ERD_Kiluan_Fase1.md) ---


class BidangUsaha(Base):
    __tablename__ = "bidang_usaha"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    kode: Mapped[str] = mapped_column(String, unique=True)
    nama: Mapped[str] = mapped_column(String)
    ikon: Mapped[str | None] = mapped_column(String)


class Umkm(Base):
    __tablename__ = "umkm"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pengguna_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    bidang_id: Mapped[int] = mapped_column(ForeignKey("bidang_usaha.id"))
    nama: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    telepon: Mapped[str | None] = mapped_column(String)
    whatsapp: Mapped[str | None] = mapped_column(String)
    alamat: Mapped[str | None] = mapped_column(String)
    lokasi_geom = mapped_column("lokasi", Geography(geometry_type="POINT", srid=4326), nullable=True)
    status_verifikasi: Mapped[str] = mapped_column(String, default="menunggu")
    diverifikasi_oleh: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pengguna.id"))
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    dihapus_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    __table_args__ = (
        CheckConstraint(
            "status_verifikasi IN ('menunggu','terverifikasi','ditolak')",
            name="ck_umkm_status_verifikasi",
        ),
    )


class ProdukJasa(Base):
    __tablename__ = "produk_jasa"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    umkm_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("umkm.id"))
    nama: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    jenis: Mapped[str] = mapped_column(String)
    harga: Mapped[float] = mapped_column()
    satuan_harga: Mapped[str] = mapped_column(String)
    stok: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String, default="draft")
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    dihapus_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    __table_args__ = (
        CheckConstraint("jenis IN ('produk','jasa')", name="ck_produk_jenis"),
        CheckConstraint("status IN ('draft','publikasi','arsip')", name="ck_produk_status"),
    )


class PaketWisata(Base):
    __tablename__ = "paket_wisata"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    agen_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    slug: Mapped[str] = mapped_column(String)
    nama: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    durasi_jam: Mapped[int] = mapped_column(Integer)
    harga: Mapped[float] = mapped_column()
    satuan_harga: Mapped[str] = mapped_column(String)
    kuota_default: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="draft")
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    dihapus_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    __table_args__ = (
        UniqueConstraint("desa_id", "slug", name="uq_paket_desa_slug"),
        CheckConstraint(
            "status IN ('draft','review','publikasi','ditolak','arsip')",
            name="ck_paket_status",
        ),
    )


class PaketItem(Base):
    __tablename__ = "paket_item"
    id: Mapped[uuid.UUID] = _pk()
    paket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("paket_wisata.id", ondelete="CASCADE"))
    hari: Mapped[int] = mapped_column(SmallInteger)
    urutan: Mapped[int] = mapped_column(SmallInteger)
    judul: Mapped[str | None] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    destinasi_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("destinasi.id"))
    layanan_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("layanan.id"))
    produk_jasa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("produk_jasa.id"))
    durasi_menit: Mapped[int] = mapped_column(Integer, default=0)


class Kontribusi(Base):
    __tablename__ = "kontribusi"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    penyumbang_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    tipe: Mapped[str] = mapped_column(String)
    target_tipe: Mapped[str] = mapped_column(String)
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    muatan = mapped_column(JSONB, default=dict)
    media_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id"))
    status: Mapped[str] = mapped_column(String, default="menunggu")
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        CheckConstraint(
            "tipe IN ('foto','tips','koreksi_data','spot_baru','ulasan')",
            name="ck_kontribusi_tipe",
        ),
        CheckConstraint(
            "target_tipe IN ('destinasi','layanan','umkm','paket_wisata','desa')",
            name="ck_kontribusi_target_tipe",
        ),
        CheckConstraint(
            "status IN ('menunggu','disetujui','ditolak','revisi')",
            name="ck_kontribusi_status",
        ),
    )


class KurasiLog(Base):
    __tablename__ = "kurasi_log"
    id: Mapped[uuid.UUID] = _pk()
    entitas_tipe: Mapped[str] = mapped_column(String)
    entitas_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    dari_status: Mapped[str] = mapped_column(String)
    ke_status: Mapped[str] = mapped_column(String)
    kurator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    keputusan: Mapped[str] = mapped_column(String)
    catatan: Mapped[str | None] = mapped_column(Text)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        CheckConstraint(
            "entitas_tipe IN ('kontribusi','paket_wisata','produk_jasa','umkm','pengajuan_kartu')",
            name="ck_kurasi_entitas_tipe",
        ),
        CheckConstraint(
            "keputusan IN ('setuju','tolak','minta_revisi','ajukan')",
            name="ck_kurasi_keputusan",
        ),
    )


class AturanPoin(Base):
    __tablename__ = "aturan_poin"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    desa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("desa.id"))
    kode_aksi: Mapped[str] = mapped_column(String)
    poin: Mapped[int] = mapped_column(Integer)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    aktif: Mapped[bool] = mapped_column(default=True)
    __table_args__ = (UniqueConstraint("desa_id", "kode_aksi", name="uq_aturan_poin_desa_kode"),)


class TransaksiPoin(Base):
    __tablename__ = "transaksi_poin"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pengguna_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    aturan_id: Mapped[int | None] = mapped_column(ForeignKey("aturan_poin.id"))
    kode_aksi: Mapped[str] = mapped_column(String)
    poin: Mapped[int] = mapped_column(Integer)
    referensi_tipe: Mapped[str | None] = mapped_column(String)
    referensi_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    dibuat_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        UniqueConstraint(
            "pengguna_id", "kode_aksi", "referensi_tipe", "referensi_id",
            name="uq_transaksi_poin_award",
        ),
    )

    @property
    def urut(self) -> int:
        if self.dibuat_pada is None:
            return 0
        return int(self.dibuat_pada.timestamp() * 1_000_000)


class Badge(Base):
    __tablename__ = "badge"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    desa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("desa.id"))
    kode: Mapped[str] = mapped_column(String, unique=True)
    nama: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    ikon: Mapped[str | None] = mapped_column(String)
    tingkat: Mapped[int] = mapped_column(SmallInteger, default=1)
    syarat = mapped_column(JSONB, default=dict)
    aktif: Mapped[bool] = mapped_column(default=True)


class BadgePengguna(Base):
    __tablename__ = "badge_pengguna"
    id: Mapped[uuid.UUID] = _pk()
    pengguna_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    badge_id: Mapped[int] = mapped_column(ForeignKey("badge.id"))
    diperoleh_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (UniqueConstraint("pengguna_id", "badge_id", name="uq_badge_pengguna"),)


class KartuAksi(Base):
    __tablename__ = "kartu_aksi"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    desa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("desa.id"))
    kode: Mapped[str] = mapped_column(String, unique=True)
    nama: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    kenapa_penting: Mapped[str | None] = mapped_column(Text)
    bukti_dibutuhkan = mapped_column(JSONB, default=dict)
    bobot: Mapped[int] = mapped_column(SmallInteger, default=0)
    aktif: Mapped[bool] = mapped_column(default=True)


class PengajuanKartu(Base):
    __tablename__ = "pengajuan_kartu"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    subjek_tipe: Mapped[str] = mapped_column(String)
    subjek_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    kartu_id: Mapped[int] = mapped_column(ForeignKey("kartu_aksi.id"))
    bukti = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String, default="menunggu")
    validator_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pengguna.id"))
    catatan: Mapped[str | None] = mapped_column(Text)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    divalidasi_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    __table_args__ = (
        CheckConstraint("subjek_tipe IN ('umkm','agen','pokdarwis')", name="ck_pengajuan_subjek_tipe"),
        CheckConstraint(
            "status IN ('menunggu','tervalidasi','ditolak','revisi')",
            name="ck_pengajuan_status",
        ),
    )


class SertifikasiOwner(Base):
    __tablename__ = "sertifikasi_owner"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    subjek_tipe: Mapped[str] = mapped_column(String)
    subjek_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    tingkat: Mapped[str] = mapped_column(String)
    skor: Mapped[int] = mapped_column(SmallInteger, default=0)
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        UniqueConstraint("desa_id", "subjek_tipe", "subjek_id", name="uq_sertifikasi_owner"),
        CheckConstraint(
            "tingkat IN ('tunas','bahari','lumba_lumba')",
            name="ck_sertifikasi_tingkat",
        ),
    )


# --- Fase 2: Dermaga inti ---


class PengaturanDesa(Base):
    __tablename__ = "pengaturan_desa"
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"), primary_key=True)
    persen_reinvestasi: Mapped[Decimal] = mapped_column(Numeric, default=Decimal("0.10"))
    persen_fee_platform: Mapped[Decimal] = mapped_column(Numeric, default=Decimal("0.02"))
    kebijakan_pembatalan = mapped_column(JSONB, default=dict)
    batas_hold_menit: Mapped[int] = mapped_column(SmallInteger, default=30)
    gateway: Mapped[str] = mapped_column(String, default="manual")
    konfig_gateway = mapped_column(JSONB, default=dict)
    diperbarui_pada: Mapped[datetime] = _ts_buat()


class SlotJadwal(Base):
    __tablename__ = "slot_jadwal"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    subjek_tipe: Mapped[str] = mapped_column(String)
    subjek_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    tanggal: Mapped[date] = mapped_column(Date)
    waktu_mulai: Mapped[time | None] = mapped_column(Time)
    waktu_selesai: Mapped[time | None] = mapped_column(Time)
    kuota: Mapped[int] = mapped_column(Integer)
    kuota_terpakai: Mapped[int] = mapped_column(Integer, default=0)
    harga_override: Mapped[Decimal | None] = mapped_column(Numeric)
    status: Mapped[str] = mapped_column(String, default="buka")

    @property
    def sisa(self) -> int:
        return self.kuota - self.kuota_terpakai


class Pesanan(Base):
    __tablename__ = "pesanan"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pembeli_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    kode_pesanan: Mapped[str] = mapped_column(String, unique=True)
    status: Mapped[str] = mapped_column(String, default="menunggu_pembayaran")
    metode_ambil: Mapped[str] = mapped_column(String, default="ambil_ditempat")
    alamat_kirim = mapped_column(JSONB, nullable=True)
    kontak = mapped_column(JSONB, default=dict)
    kupon_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("kupon.id"))
    subtotal: Mapped[Decimal] = mapped_column(Numeric, default=0)
    diskon: Mapped[Decimal] = mapped_column(Numeric, default=0)
    ongkir: Mapped[Decimal] = mapped_column(Numeric, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric, default=0)
    kedaluwarsa_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()


class PesananItem(Base):
    __tablename__ = "pesanan_item"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pesanan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pesanan.id", ondelete="CASCADE"))
    item_tipe: Mapped[str] = mapped_column(String)
    item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    penyedia_tipe: Mapped[str] = mapped_column(String)
    penyedia_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    nama_snapshot: Mapped[str] = mapped_column(String)
    harga_snapshot: Mapped[Decimal] = mapped_column(Numeric)
    jumlah: Mapped[int] = mapped_column(Integer)
    satuan: Mapped[str] = mapped_column(String, default="pcs")
    subtotal: Mapped[Decimal] = mapped_column(Numeric)
    slot_jadwal_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("slot_jadwal.id"))
    status_fulfillment: Mapped[str] = mapped_column(String, default="menunggu")
    metadata_item = mapped_column("metadata", JSONB, default=dict)


class Booking(Base):
    __tablename__ = "booking"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pesanan_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pesanan_item.id"), unique=True)
    slot_jadwal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("slot_jadwal.id"))
    destinasi_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("destinasi.id"))
    jumlah_orang: Mapped[int] = mapped_column(Integer)
    tanggal_kunjungan: Mapped[date] = mapped_column(Date)
    kode_checkin: Mapped[str] = mapped_column(String, unique=True)
    status: Mapped[str] = mapped_column(String, default="dipesan")
    checkin_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    dibuat_pada: Mapped[datetime] = _ts_buat()


class Pembayaran(Base):
    __tablename__ = "pembayaran"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pesanan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pesanan.id"))
    metode: Mapped[str] = mapped_column(String)
    penyedia_gateway: Mapped[str] = mapped_column(String)
    jumlah: Mapped[Decimal] = mapped_column(Numeric)
    status: Mapped[str] = mapped_column(String, default="menunggu")
    ref_eksternal: Mapped[str | None] = mapped_column(String)
    redirect_url: Mapped[str | None] = mapped_column(String)
    bukti_media_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id"))
    kedaluwarsa_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    dibayar_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    mentah = mapped_column(JSONB, default=dict)
    dibuat_pada: Mapped[datetime] = _ts_buat()


class Transaksi(Base):
    __tablename__ = "transaksi"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pesanan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pesanan.id"))
    pembayaran_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pembayaran.id"))
    penyedia_tipe: Mapped[str] = mapped_column(String)
    penyedia_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    jenis: Mapped[str] = mapped_column(String)
    bruto: Mapped[Decimal] = mapped_column(Numeric)
    fee_platform: Mapped[Decimal] = mapped_column(Numeric)
    porsi_reinvestasi: Mapped[Decimal] = mapped_column(Numeric)
    neto_penyedia: Mapped[Decimal] = mapped_column(Numeric)
    status: Mapped[str] = mapped_column(String)
    payout_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("payout.id"))
    dibuat_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        CheckConstraint(
            "bruto = fee_platform + porsi_reinvestasi + neto_penyedia",
            name="ck_transaksi_split",
        ),
    )


class RekeningPenyedia(Base):
    __tablename__ = "rekening_penyedia"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    penyedia_tipe: Mapped[str] = mapped_column(String)
    penyedia_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    jenis: Mapped[str] = mapped_column(String)
    bank_kode: Mapped[str | None] = mapped_column(String)
    nomor: Mapped[str] = mapped_column(String)
    nama_pemilik: Mapped[str] = mapped_column(String)
    terverifikasi: Mapped[bool] = mapped_column(Boolean, default=False)
    utama: Mapped[bool] = mapped_column(Boolean, default=True)
    dibuat_pada: Mapped[datetime] = _ts_buat()


class Payout(Base):
    __tablename__ = "payout"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    penyedia_tipe: Mapped[str] = mapped_column(String)
    penyedia_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    rekening_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rekening_penyedia.id"))
    jumlah: Mapped[Decimal] = mapped_column(Numeric)
    metode: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="antri")
    ref_eksternal: Mapped[str | None] = mapped_column(String)
    catatan: Mapped[str | None] = mapped_column(Text)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diproses_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))


class Refund(Base):
    __tablename__ = "refund"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pesanan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pesanan.id"))
    pesanan_item_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pesanan_item.id"))
    pemohon_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    alasan: Mapped[str] = mapped_column(Text)
    jumlah: Mapped[Decimal] = mapped_column(Numeric)
    status: Mapped[str] = mapped_column(String, default="diajukan")
    ref_eksternal: Mapped[str | None] = mapped_column(String)
    disetujui_oleh: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pengguna.id"))
    dibuat_pada: Mapped[datetime] = _ts_buat()
    selesai_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))


class WebhookPembayaran(Base):
    __tablename__ = "webhook_pembayaran"
    id: Mapped[uuid.UUID] = _pk()
    penyedia_gateway: Mapped[str] = mapped_column(String)
    event_id: Mapped[str] = mapped_column(String, unique=True)
    ref_eksternal: Mapped[str] = mapped_column(String)
    jenis_event: Mapped[str] = mapped_column(String)
    muatan = mapped_column(JSONB, default=dict)
    status_proses: Mapped[str] = mapped_column(String, default="diterima")
    diterima_pada: Mapped[datetime] = _ts_buat()
    diproses_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))


class KatalogHadiah(Base):
    __tablename__ = "katalog_hadiah"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("desa.id"))
    kode: Mapped[str] = mapped_column(String, unique=True)
    nama: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    jenis: Mapped[str] = mapped_column(String)
    biaya_poin: Mapped[int] = mapped_column(Integer)
    stok: Mapped[int | None] = mapped_column(Integer)
    syarat = mapped_column(JSONB, default=dict)
    media_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id"))
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    berlaku_mulai: Mapped[date | None] = mapped_column(Date)
    berlaku_sampai: Mapped[date | None] = mapped_column(Date)


class Kupon(Base):
    __tablename__ = "kupon"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    kode: Mapped[str] = mapped_column(String, unique=True)
    pemilik_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pengguna.id"))
    sumber: Mapped[str] = mapped_column(String)
    tipe_diskon: Mapped[str] = mapped_column(String)
    nilai: Mapped[Decimal] = mapped_column(Numeric)
    min_belanja: Mapped[Decimal | None] = mapped_column(Numeric)
    batas_pakai: Mapped[int] = mapped_column(Integer)
    terpakai: Mapped[int] = mapped_column(Integer, default=0)
    penyedia_terbatas = mapped_column(JSONB, nullable=True)
    berlaku_mulai: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    berlaku_sampai: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    status: Mapped[str] = mapped_column(String, default="aktif")
    dibuat_pada: Mapped[datetime] = _ts_buat()


class PenukaranPoin(Base):
    __tablename__ = "penukaran_poin"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pengguna_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    hadiah_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("katalog_hadiah.id"))
    poin_dipakai: Mapped[int] = mapped_column(Integer)
    kupon_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("kupon.id"))
    status: Mapped[str] = mapped_column(String, default="berhasil")
    dibuat_pada: Mapped[datetime] = _ts_buat()


class PemakaianKupon(Base):
    __tablename__ = "pemakaian_kupon"
    id: Mapped[uuid.UUID] = _pk()
    kupon_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kupon.id"))
    pesanan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pesanan.id"))
    pengguna_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    jumlah_diskon: Mapped[Decimal] = mapped_column(Numeric)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        UniqueConstraint("kupon_id", "pesanan_id", name="uq_pemakaian_kupon_pesanan"),
    )


class StasiunLestari(Base):
    __tablename__ = "stasiun_lestari"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    nama: Mapped[str] = mapped_column(String)
    tipe: Mapped[str] = mapped_column(String)
    destinasi_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("destinasi.id"))
    lokasi_geom = mapped_column("lokasi", Geography(geometry_type="POINT", srid=4326), nullable=True)
    qr_token: Mapped[str] = mapped_column(String, unique=True)
    radius_m: Mapped[int] = mapped_column(Integer, default=50)
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    dibuat_pada: Mapped[datetime] = _ts_buat()


class Misi(Base):
    __tablename__ = "misi"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("desa.id"))
    kode: Mapped[str] = mapped_column(String, unique=True)
    judul: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str | None] = mapped_column(Text)
    jenis: Mapped[str] = mapped_column(String)
    kategori: Mapped[str] = mapped_column(String)
    micro_lesson = mapped_column(JSONB, nullable=True)
    syarat_verifikasi = mapped_column(JSONB, default=dict)
    stasiun_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("stasiun_lestari.id"))
    poin: Mapped[int] = mapped_column(Integer, default=0)
    badge_id: Mapped[int | None] = mapped_column(SmallInteger, ForeignKey("badge.id"))
    dampak_template = mapped_column(JSONB, default=dict)
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    dibuat_pada: Mapped[datetime] = _ts_buat()


class PasporLestari(Base):
    __tablename__ = "paspor_lestari"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pengguna_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    ringkasan_dampak = mapped_column(JSONB, default=dict)
    total_stempel: Mapped[int] = mapped_column(Integer, default=0)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    __table_args__ = (UniqueConstraint("desa_id", "pengguna_id", name="uq_paspor_desa_pengguna"),)


class Stempel(Base):
    __tablename__ = "stempel"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    paspor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("paspor_lestari.id"))
    misi_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("misi.id"))
    booking_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("booking.id"))
    stasiun_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("stasiun_lestari.id"))
    dampak = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String, default="menunggu_verifikasi")
    lokasi_geom = mapped_column("lokasi", Geography(geometry_type="POINT", srid=4326), nullable=True)
    media_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id"))
    dibuat_pada: Mapped[datetime] = _ts_buat()


class Verifikasi(Base):
    __tablename__ = "verifikasi"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    entitas_tipe: Mapped[str] = mapped_column(String)
    entitas_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    metode: Mapped[str] = mapped_column(String)
    verifikator_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pengguna.id"))
    syarat = mapped_column(JSONB, default=dict)
    hasil: Mapped[str] = mapped_column(String, default="menunggu")
    bukti = mapped_column(JSONB, nullable=True)
    lokasi_geom = mapped_column("lokasi", Geography(geometry_type="POINT", srid=4326), nullable=True)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diputuskan_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))


class SesiPemandu(Base):
    __tablename__ = "sesi_pemandu"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    pengguna_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pengguna.id"))
    tipe: Mapped[str] = mapped_column(String)
    masukan = mapped_column(JSONB, default=dict)
    keluaran = mapped_column(JSONB, nullable=True)
    model_dipakai: Mapped[str] = mapped_column(String, default="rule")
    dibuat_pada: Mapped[datetime] = _ts_buat()


class PercakapanPemandu(Base):
    __tablename__ = "percakapan_pemandu"
    id: Mapped[uuid.UUID] = _pk()
    sesi_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sesi_pemandu.id", ondelete="CASCADE"),
    )
    peran: Mapped[str] = mapped_column(String)
    isi: Mapped[str] = mapped_column(Text)
    sumber = mapped_column(JSONB, nullable=True)
    dibuat_pada: Mapped[datetime] = _ts_buat()


# --- F2 addendum: Warta & Genta ---


class Berita(Base):
    __tablename__ = "berita"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    penulis_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    slug: Mapped[str] = mapped_column(Text)
    judul: Mapped[str] = mapped_column(Text)
    ringkasan: Mapped[str | None] = mapped_column(Text)
    konten: Mapped[str] = mapped_column(Text, default="")
    sampul_media_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id"))
    kategori: Mapped[str] = mapped_column(String, default="lainnya")
    status: Mapped[str] = mapped_column(String, default="draft")
    terbit_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    sorotan: Mapped[bool] = mapped_column(Boolean, default=False)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    dihapus_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    __table_args__ = (
        UniqueConstraint("desa_id", "slug", name="uq_berita_desa_slug"),
        CheckConstraint(
            "kategori IN ('pengumuman','cerita','konservasi','acara','panduan','lainnya')",
            name="ck_berita_kategori",
        ),
        CheckConstraint("status IN ('draft','publikasi','arsip')", name="ck_berita_status"),
    )

    @property
    def urut(self) -> int:
        ts = self.terbit_pada or self.dibuat_pada
        return int(ts.timestamp() * 1_000_000) if ts else 0


class BeritaTag(Base):
    __tablename__ = "berita_tag"
    berita_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("berita.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tag.id"), primary_key=True)


class Peristiwa(Base):
    __tablename__ = "peristiwa"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    jenis: Mapped[str] = mapped_column(String)
    entitas_tipe: Mapped[str] = mapped_column(String)
    entitas_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    muatan = mapped_column(JSONB, default=dict)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    diproses_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    __table_args__ = (
        CheckConstraint(
            "jenis IN ('pembayaran_menunggu_konfirmasi','pembayaran_berhasil',"
            "'pesanan_dibayar','booking_terkonfirmasi','booking_checkin',"
            "'pesanan_selesai','transaksi_dirilis','payout_dibuat','payout_berhasil',"
            "'refund_diajukan','refund_selesai','tukar_poin_berhasil','stempel_terverifikasi',"
            "'booking_selesai','transaksi_settle','monitoring_terverifikasi',"
            "'kartu_tervalidasi','kontribusi_disetujui')",
            name="ck_peristiwa_jenis",
        ),
    )

    @property
    def urut(self) -> int:
        return int(self.dibuat_pada.timestamp() * 1_000_000) if self.dibuat_pada else 0


class Notifikasi(Base):
    __tablename__ = "notifikasi"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    penerima_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    peristiwa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("peristiwa.id"))
    tipe: Mapped[str] = mapped_column(String)
    judul: Mapped[str] = mapped_column(Text)
    isi: Mapped[str] = mapped_column(Text)
    entitas_tipe: Mapped[str] = mapped_column(String)
    entitas_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    kanal: Mapped[str] = mapped_column(String, default="in_app")
    status: Mapped[str] = mapped_column(String, default="belum_dibaca")
    dibuat_pada: Mapped[datetime] = _ts_buat()
    dibaca_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    __table_args__ = (
        CheckConstraint("kanal IN ('in_app','email')", name="ck_notifikasi_kanal"),
        CheckConstraint("status IN ('belum_dibaca','dibaca')", name="ck_notifikasi_status"),
        UniqueConstraint(
            "peristiwa_id", "penerima_id", "tipe", name="uq_notifikasi_peristiwa_penerima_tipe",
        ),
    )

    @property
    def urut(self) -> int:
        return int(self.dibuat_pada.timestamp() * 1_000_000) if self.dibuat_pada else 0


class Simpanan(Base):
    __tablename__ = "simpanan"
    id: Mapped[uuid.UUID] = _pk()
    pengguna_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    tipe: Mapped[str] = mapped_column(String)
    entitas_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    catatan: Mapped[str | None] = mapped_column(Text)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        CheckConstraint(
            "tipe IN ('destinasi','paket','misi')",
            name="ck_simpanan_tipe",
        ),
        UniqueConstraint("pengguna_id", "tipe", "entitas_id", name="uq_simpanan_pengguna_entitas"),
    )

    @property
    def urut(self) -> int:
        return int(self.dibuat_pada.timestamp() * 1_000_000) if self.dibuat_pada else 0


# --- F3: Jejak Lestari + Anjungan Data ---


class IndikatorEkologi(Base):
    __tablename__ = "indikator_ekologi"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    desa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("desa.id"))
    kode: Mapped[str] = mapped_column(String)
    nama: Mapped[str] = mapped_column(String)
    satuan: Mapped[str] = mapped_column(String)
    arah_baik: Mapped[str] = mapped_column(String)
    deskripsi: Mapped[str] = mapped_column(Text, default="")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (
        CheckConstraint("arah_baik IN ('naik','turun')", name="ck_indikator_arah_baik"),
        UniqueConstraint("desa_id", "kode", name="uq_indikator_desa_kode"),
    )


class MonitoringEkologi(Base):
    __tablename__ = "monitoring_ekologi"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    indikator_id: Mapped[int] = mapped_column(ForeignKey("indikator_ekologi.id"))
    destinasi_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("destinasi.id"))
    nilai: Mapped[Decimal] = mapped_column(Numeric)
    waktu_ukur: Mapped[date] = mapped_column(Date)
    pencatat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    metode: Mapped[str] = mapped_column(String)
    media_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id"))
    status: Mapped[str] = mapped_column(String, default="menunggu_verifikasi")
    catatan: Mapped[str] = mapped_column(Text, default="")
    lokasi_geom = mapped_column("lokasi", Geography(geometry_type="POINT", srid=4326), nullable=True)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        CheckConstraint(
            "metode IN ('survei_lapangan','sensor','laporan_warga','pihak_ketiga')",
            name="ck_monitoring_metode",
        ),
        CheckConstraint(
            "status IN ('menunggu_verifikasi','terverifikasi','ditolak')",
            name="ck_monitoring_status",
        ),
    )

    @property
    def urut(self) -> int:
        return int(self.dibuat_pada.timestamp() * 1_000_000) if self.dibuat_pada else 0


class DayaDukung(Base):
    __tablename__ = "daya_dukung"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    destinasi_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("destinasi.id"))
    kapasitas_harian: Mapped[int] = mapped_column(Integer)
    ambang_kuning: Mapped[Decimal] = mapped_column(Numeric)
    ambang_merah: Mapped[Decimal] = mapped_column(Numeric)
    metode_hitung: Mapped[str] = mapped_column(String, default="booking+checkin")
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (UniqueConstraint("destinasi_id", name="uq_daya_dukung_destinasi"),)


class PemakaianKapasitas(Base):
    __tablename__ = "pemakaian_kapasitas"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    destinasi_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("destinasi.id"))
    tanggal: Mapped[date] = mapped_column(Date)
    kunjungan: Mapped[int] = mapped_column(Integer)
    kapasitas_harian: Mapped[int] = mapped_column(Integer)
    rasio: Mapped[Decimal] = mapped_column(Numeric)
    level: Mapped[str] = mapped_column(String)
    dihitung_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        CheckConstraint("level IN ('hijau','kuning','merah')", name="ck_pemakaian_level"),
        UniqueConstraint("destinasi_id", "tanggal", name="uq_pemakaian_destinasi_tanggal"),
    )


class DanaKonservasi(Base):
    __tablename__ = "dana_konservasi"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    jenis: Mapped[str] = mapped_column(String)
    sumber_tipe: Mapped[str | None] = mapped_column(String)
    sumber_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    kategori: Mapped[str | None] = mapped_column(String)
    jumlah: Mapped[Decimal] = mapped_column(Numeric)
    keterangan: Mapped[str] = mapped_column(Text, default="")
    bukti_media_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id"))
    tanggal: Mapped[date] = mapped_column(Date)
    dicatat_oleh: Mapped[uuid.UUID] = mapped_column(ForeignKey("pengguna.id"))
    dibuat_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        CheckConstraint("jenis IN ('masuk','keluar')", name="ck_dana_jenis"),
        CheckConstraint(
            "sumber_tipe IS NULL OR sumber_tipe IN ('transaksi','donasi','hibah','lainnya')",
            name="ck_dana_sumber_tipe",
        ),
        CheckConstraint(
            "kategori IS NULL OR kategori IN ("
            "'rehabilitasi_karang','penanaman_mangrove','pengelolaan_sampah',"
            "'edukasi','operasional','lainnya')",
            name="ck_dana_kategori",
        ),
    )

    @property
    def urut(self) -> int:
        return int(self.dibuat_pada.timestamp() * 1_000_000) if self.dibuat_pada else 0


class NeracaRegeneratif(Base):
    __tablename__ = "neraca_regeneratif"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    periode: Mapped[str] = mapped_column(String)
    skor_ekologi: Mapped[Decimal] = mapped_column(Numeric)
    skor_sosial: Mapped[Decimal] = mapped_column(Numeric)
    skor_ekonomi: Mapped[Decimal] = mapped_column(Numeric)
    skor_total: Mapped[Decimal] = mapped_column(Numeric)
    komponen = mapped_column(JSONB, default=dict)
    terkunci: Mapped[bool] = mapped_column(Boolean, default=False)
    dibuat_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (UniqueConstraint("desa_id", "periode", name="uq_neraca_desa_periode"),)


class JobAnalitik(Base):
    __tablename__ = "job_analitik"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("desa.id"))
    lapisan: Mapped[str] = mapped_column(String)
    nama_job: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    baris_masuk: Mapped[int] = mapped_column(sa.BigInteger, default=0)
    baris_keluar: Mapped[int] = mapped_column(sa.BigInteger, default=0)
    mulai_pada: Mapped[datetime] = _ts_buat()
    selesai_pada: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    galat: Mapped[str | None] = mapped_column(Text)
    __table_args__ = (
        CheckConstraint("lapisan IN ('bronze','silver','gold')", name="ck_job_lapisan"),
        CheckConstraint("status IN ('berjalan','sukses','gagal')", name="ck_job_status"),
    )


class AgregatHarian(Base):
    __tablename__ = "agregat_harian"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    tanggal: Mapped[date] = mapped_column(Date)
    kode_metrik: Mapped[str] = mapped_column(String)
    dimensi = mapped_column(JSONB, default=dict)
    nilai: Mapped[Decimal] = mapped_column(Numeric)
    diperbarui_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        CheckConstraint(
            "kode_metrik IN ("
            "'kunjungan','pendapatan','booking_selesai','transaksi_langsung',"
            "'umkm_aktif','kontribusi','adopsi_regeneratif','booking_per_tingkat')",
            name="ck_agregat_kode_metrik",
        ),
        UniqueConstraint("desa_id", "tanggal", "kode_metrik", "dimensi", name="uq_agregat_baris"),
    )

    @property
    def urut(self) -> int:
        ts = self.diperbarui_pada
        return int(ts.timestamp() * 1_000_000) if ts else 0


class LaporanBulanan(Base):
    __tablename__ = "laporan_bulanan"
    id: Mapped[uuid.UUID] = _pk()
    desa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("desa.id"))
    periode: Mapped[str] = mapped_column(String)
    ringkasan = mapped_column(JSONB, default=dict)
    file_media_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id"))
    status: Mapped[str] = mapped_column(String, default="draf")
    dibuat_pada: Mapped[datetime] = _ts_buat()
    __table_args__ = (
        CheckConstraint("status IN ('draf','final')", name="ck_laporan_status"),
        UniqueConstraint("desa_id", "periode", name="uq_laporan_desa_periode"),
    )
