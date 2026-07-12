"""bootstrap F0 — PostGIS + 13 tabel + seed referensi & admin.

Revision ID: 0001_bootstrap_f0
Revises:
Create Date: 2025-07-08

Menciptakan seluruh skema Fase 0 sesuai ERD_Kiluan_Fase0.md dalam satu migrasi
bootstrap, plus seed: peran (8), kategori awal, desa Teluk Kiluan, akun admin
pertama + keanggotaan global admin. Enum ditegakkan lewat CHECK (bukan ENUM
native) agar mudah ditambah tanpa migrasi berat.
"""
from __future__ import annotations

import os
import uuid

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID

revision = "0001_bootstrap_f0"
down_revision = None
branch_labels = None
depends_on = None

TS = TIMESTAMP(timezone=True)


def _uid_col():
    return sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _dibuat():
    return sa.Column("dibuat_pada", TS, server_default=sa.text("now()"), nullable=False)


def _diperbarui():
    return sa.Column("diperbarui_pada", TS, server_default=sa.text("now()"), nullable=False)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # --- peran (referensi RBAC) ---
    op.create_table(
        "peran",
        sa.Column("id", sa.SmallInteger, primary_key=True, autoincrement=False),
        sa.Column("kode", sa.String, nullable=False, unique=True),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("scoped_desa", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.CheckConstraint(
            "kode IN ('wisatawan','pokdarwis','umkm','agen','kontributor',"
            "'organisasi','perangkat_desa','admin')",
            name="ck_peran_kode",
        ),
    )

    # --- kategori (taksonomi destinasi, global) ---
    op.create_table(
        "kategori",
        sa.Column("id", sa.SmallInteger, primary_key=True, autoincrement=True),
        sa.Column("kode", sa.String, nullable=False, unique=True),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("ikon", sa.String),
        sa.Column("urutan", sa.SmallInteger, server_default="0"),
    )

    # --- desa (tenant root) ---
    op.create_table(
        "desa",
        _uid_col(),
        sa.Column("slug", sa.String, nullable=False, unique=True),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("lokasi", Geography(geometry_type="POINT", srid=4326, spatial_index=False)),
        sa.Column("provinsi", sa.String),
        sa.Column("kabupaten", sa.String),
        sa.Column("kecamatan", sa.String),
        sa.Column("pekon", sa.String),
        sa.Column("logo_media_id", UUID(as_uuid=True)),
        sa.Column("warna_primer", sa.String),
        sa.Column("status", sa.String, nullable=False, server_default="draft"),
        _dibuat(),
        _diperbarui(),
        sa.CheckConstraint("status IN ('draft','aktif','nonaktif')", name="ck_desa_status"),
    )
    op.create_index("ix_desa_lokasi_gist", "desa", ["lokasi"], postgresql_using="gist")

    # --- pengguna ---
    op.create_table(
        "pengguna",
        _uid_col(),
        sa.Column("email", sa.String, nullable=False, unique=True),  # produksi: CITEXT
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("kata_sandi_hash", sa.String, nullable=False),
        sa.Column("telepon", sa.String),
        sa.Column("avatar_media_id", UUID(as_uuid=True)),
        sa.Column("status", sa.String, nullable=False, server_default="pending"),
        sa.Column("email_terverifikasi_pada", TS),
        sa.Column("login_terakhir", TS),
        _dibuat(),
        _diperbarui(),
        sa.CheckConstraint(
            "status IN ('pending','aktif','nonaktif','tersuspensi')", name="ck_pengguna_status"
        ),
    )

    # --- keanggotaan (pengguna x desa x peran) ---
    op.create_table(
        "keanggotaan",
        _uid_col(),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id")),  # null=global
        sa.Column("peran_id", sa.SmallInteger, sa.ForeignKey("peran.id"), nullable=False),
        sa.Column("status", sa.String, nullable=False, server_default="menunggu"),
        _dibuat(),
        _diperbarui(),
        sa.UniqueConstraint("pengguna_id", "desa_id", "peran_id", name="uq_keanggotaan"),
        sa.CheckConstraint(
            "status IN ('aktif','menunggu','ditolak','revisi','nonaktif')", name="ck_keanggotaan_status"
        ),
    )
    op.create_index("ix_keanggotaan_desa_peran_status", "keanggotaan", ["desa_id", "peran_id", "status"])

    # --- token_auth ---
    op.create_table(
        "token_auth",
        _uid_col(),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("tipe", sa.String, nullable=False),
        sa.Column("token_hash", sa.String, nullable=False),
        sa.Column("kedaluwarsa_pada", TS, nullable=False),
        sa.Column("dipakai_pada", TS),
        _dibuat(),
        sa.CheckConstraint(
            "tipe IN ('penyegar','verifikasi_email','reset_sandi')", name="ck_token_tipe"
        ),
    )
    op.create_index("ix_token_pengguna_tipe", "token_auth", ["pengguna_id", "tipe"])
    op.create_index("ix_token_kedaluwarsa", "token_auth", ["kedaluwarsa_pada"])

    # --- destinasi ---
    op.create_table(
        "destinasi",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("slug", sa.String, nullable=False),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("kategori_id", sa.SmallInteger, sa.ForeignKey("kategori.id"), nullable=False),
        sa.Column("lokasi", Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("area", Geography(geometry_type="POLYGON", srid=4326, spatial_index=False)),
        sa.Column("alamat", sa.String),
        sa.Column("daya_dukung_harian", sa.Integer),  # slot F3
        sa.Column("jam_operasional", JSONB),
        sa.Column("status", sa.String, nullable=False, server_default="draft"),
        sa.Column("dibuat_oleh", UUID(as_uuid=True), sa.ForeignKey("pengguna.id")),
        _dibuat(),
        _diperbarui(),
        sa.Column("dihapus_pada", TS),
        sa.UniqueConstraint("desa_id", "slug", name="uq_destinasi_desa_slug"),
        sa.CheckConstraint("status IN ('draft','publikasi','arsip')", name="ck_destinasi_status"),
    )
    op.create_index("ix_destinasi_lokasi_gist", "destinasi", ["lokasi"], postgresql_using="gist")
    op.create_index("ix_destinasi_area_gist", "destinasi", ["area"], postgresql_using="gist")
    op.create_index("ix_destinasi_desa_status_kat", "destinasi", ["desa_id", "status", "kategori_id"])

    # --- layanan ---
    op.create_table(
        "layanan",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("destinasi_id", UUID(as_uuid=True), sa.ForeignKey("destinasi.id")),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("jenis", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("harga", sa.Numeric(12, 2), nullable=False),
        sa.Column("satuan_harga", sa.String, nullable=False),
        sa.Column("ketersediaan", JSONB),
        sa.Column("penyedia_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id")),
        sa.Column("status", sa.String, nullable=False, server_default="draft"),
        _dibuat(),
        _diperbarui(),
        sa.Column("dihapus_pada", TS),
        sa.CheckConstraint(
            "jenis IN ('transportasi','pemandu','penginapan','sewa_alat','kuliner',"
            "'tiket_masuk','lainnya')",
            name="ck_layanan_jenis",
        ),
        sa.CheckConstraint(
            "satuan_harga IN ('per_orang','per_paket','per_malam','per_unit','per_jam')",
            name="ck_layanan_satuan",
        ),
        sa.CheckConstraint("status IN ('draft','publikasi','arsip')", name="ck_layanan_status"),
    )
    op.create_index("ix_layanan_desa_status_jenis", "layanan", ["desa_id", "status", "jenis"])
    op.create_index("ix_layanan_destinasi", "layanan", ["destinasi_id"])

    # --- kalender_aktivitas ---
    op.create_table(
        "kalender_aktivitas",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("destinasi_id", UUID(as_uuid=True), sa.ForeignKey("destinasi.id")),
        sa.Column("judul", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("tipe", sa.String, nullable=False),
        sa.Column("waktu_mulai", sa.Time),
        sa.Column("waktu_selesai", sa.Time),
        sa.Column("pengulangan", JSONB),
        sa.Column("berlaku_mulai", sa.Date),
        sa.Column("berlaku_sampai", sa.Date),
        sa.Column("status", sa.String, nullable=False, server_default="aktif"),
        _dibuat(),
        sa.CheckConstraint("tipe IN ('harian','musiman','event')", name="ck_kalender_tipe"),
        sa.CheckConstraint("status IN ('aktif','nonaktif')", name="ck_kalender_status"),
    )
    op.create_index("ix_kalender_desa_destinasi", "kalender_aktivitas", ["desa_id", "destinasi_id"])

    # --- media ---
    op.create_table(
        "media",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("objek_minio", sa.String, nullable=False, unique=True),
        sa.Column("url", sa.String),
        sa.Column("tipe", sa.String, nullable=False),
        sa.Column("mime", sa.String),
        sa.Column("ukuran", sa.BigInteger),
        sa.Column("lebar", sa.Integer),
        sa.Column("tinggi", sa.Integer),
        sa.Column("alt", sa.String),
        sa.Column("diunggah_oleh", UUID(as_uuid=True), sa.ForeignKey("pengguna.id")),
        _dibuat(),
        sa.CheckConstraint("tipe IN ('foto','video')", name="ck_media_tipe"),
    )

    # --- media_lampiran (polimorfik, tanpa FK keras ke entitas) ---
    op.create_table(
        "media_lampiran",
        _uid_col(),
        sa.Column("media_id", UUID(as_uuid=True), sa.ForeignKey("media.id"), nullable=False),
        sa.Column("entitas_tipe", sa.String, nullable=False),
        sa.Column("entitas_id", UUID(as_uuid=True), nullable=False),
        sa.Column("urutan", sa.SmallInteger, server_default="0"),
        sa.Column("utama", sa.Boolean, server_default=sa.text("false")),
        sa.CheckConstraint(
            "entitas_tipe IN ('destinasi','layanan','desa','pengguna')", name="ck_lampiran_entitas"
        ),
    )
    op.create_index("ix_lampiran_entitas", "media_lampiran", ["entitas_tipe", "entitas_id"])

    # --- tag & destinasi_tag ---
    op.create_table(
        "tag",
        sa.Column("id", sa.SmallInteger, primary_key=True, autoincrement=True),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id")),  # null=global
        sa.Column("kode", sa.String, nullable=False, unique=True),
        sa.Column("nama", sa.String, nullable=False),
    )
    op.create_table(
        "destinasi_tag",
        sa.Column("destinasi_id", UUID(as_uuid=True), sa.ForeignKey("destinasi.id"), primary_key=True),
        sa.Column("tag_id", sa.SmallInteger, sa.ForeignKey("tag.id"), primary_key=True),
    )

    _seed()


def _seed() -> None:
    bind = op.get_bind()

    # peran (id tetap; scoped_desa=false utk peran global)
    peran = sa.table(
        "peran",
        sa.column("id", sa.SmallInteger),
        sa.column("kode", sa.String),
        sa.column("nama", sa.String),
        sa.column("scoped_desa", sa.Boolean),
    )
    op.bulk_insert(
        peran,
        [
            {"id": 1, "kode": "wisatawan", "nama": "Wisatawan", "scoped_desa": False},
            {"id": 2, "kode": "pokdarwis", "nama": "Pokdarwis", "scoped_desa": True},
            {"id": 3, "kode": "umkm", "nama": "UMKM", "scoped_desa": True},
            {"id": 4, "kode": "agen", "nama": "Agen Lokal", "scoped_desa": True},
            {"id": 5, "kode": "kontributor", "nama": "Kontributor Umum", "scoped_desa": False},
            {"id": 6, "kode": "organisasi", "nama": "Organisasi/Mitra", "scoped_desa": True},
            {"id": 7, "kode": "perangkat_desa", "nama": "Perangkat Desa", "scoped_desa": True},
            {"id": 8, "kode": "admin", "nama": "Admin/Steward", "scoped_desa": False},
        ],
    )

    # kategori awal
    kategori = sa.table(
        "kategori",
        sa.column("id", sa.SmallInteger),
        sa.column("kode", sa.String),
        sa.column("nama", sa.String),
        sa.column("urutan", sa.SmallInteger),
    )
    op.bulk_insert(
        kategori,
        [
            {"id": 1, "kode": "pantai", "nama": "Pantai", "urutan": 1},
            {"id": 2, "kode": "snorkeling", "nama": "Snorkeling", "urutan": 2},
            {"id": 3, "kode": "mangrove", "nama": "Mangrove", "urutan": 3},
            {"id": 4, "kode": "budaya", "nama": "Budaya", "urutan": 4},
            {"id": 5, "kode": "kuliner", "nama": "Kuliner", "urutan": 5},
        ],
    )

    # desa Teluk Kiluan (flagship). Koordinat perkiraan Teluk Kiluan.
    desa_id = str(uuid.uuid4())
    bind.execute(
        sa.text(
            "INSERT INTO desa (id, slug, nama, deskripsi, lokasi, provinsi, kabupaten, "
            "kecamatan, pekon, status) VALUES "
            "(:id, :slug, :nama, :deskripsi, "
            "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), "
            ":prov, :kab, :kec, :pekon, 'aktif')"
        ),
        {
            "id": desa_id,
            "slug": "teluk-kiluan",
            "nama": "Desa Wisata Teluk Kiluan",
            "deskripsi": "Teluk Kiluan, Kelumbayan, Tanggamus, Lampung — habitat lumba-lumba & ekowisata bahari.",
            "lng": 105.1985,
            "lat": -5.7497,
            "prov": "Lampung",
            "kab": "Tanggamus",
            "kec": "Kelumbayan",
            "pekon": "Kiluan Negeri",
        },
    )

    # admin pertama + keanggotaan global admin
    try:
        from argon2 import PasswordHasher

        admin_hash = PasswordHasher().hash(os.environ.get("ADMIN_SANDI_AWAL", "ubah-saya"))
    except Exception:  # pragma: no cover
        # Fallback bila argon2 tak tersedia saat migrasi: tandai agar direset via B1.
        admin_hash = "RESET_DIPERLUKAN"

    admin_id = str(uuid.uuid4())
    bind.execute(
        sa.text(
            "INSERT INTO pengguna (id, email, nama, kata_sandi_hash, status, "
            "email_terverifikasi_pada) VALUES "
            "(:id, :email, :nama, :hash, 'aktif', now())"
        ),
        {
            "id": admin_id,
            "email": os.environ.get("ADMIN_EMAIL", "admin@kiluan.local"),
            "nama": "Admin Kiluan",
            "hash": admin_hash,
        },
    )
    bind.execute(
        sa.text(
            "INSERT INTO keanggotaan (id, pengguna_id, desa_id, peran_id, status) "
            "VALUES (:id, :pid, NULL, 8, 'aktif')"
        ),
        {"id": str(uuid.uuid4()), "pid": admin_id},
    )


def downgrade() -> None:
    for t in (
        "destinasi_tag",
        "tag",
        "media_lampiran",
        "media",
        "kalender_aktivitas",
        "layanan",
        "destinasi",
        "token_auth",
        "keanggotaan",
        "pengguna",
        "desa",
        "kategori",
        "peran",
    ):
        op.drop_table(t)
    # Ekstensi PostGIS sengaja tidak di-drop (mungkin dipakai objek lain).
