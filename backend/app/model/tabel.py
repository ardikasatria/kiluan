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
            "'umkm','produk_jasa','paket_wisata','kontribusi')",
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
