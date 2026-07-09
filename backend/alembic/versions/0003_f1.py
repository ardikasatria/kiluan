"""0003 — Fase 1: Pasar Desa, Dapur Konten, Lencana Warga, Naik Kelas Lestari.

Revision ID: 0003_f1
Revises: 0002_bmkg_desa
"""
from __future__ import annotations

import json
import uuid

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID

revision = "0003_f1"
down_revision = "0002_bmkg_desa"
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
    # --- bidang_usaha ---
    op.create_table(
        "bidang_usaha",
        sa.Column("id", sa.SmallInteger, primary_key=True, autoincrement=True),
        sa.Column("kode", sa.String, nullable=False, unique=True),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("ikon", sa.String),
    )

    # --- umkm ---
    op.create_table(
        "umkm",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("bidang_id", sa.SmallInteger, sa.ForeignKey("bidang_usaha.id"), nullable=False),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("telepon", sa.String),
        sa.Column("whatsapp", sa.String),
        sa.Column("alamat", sa.String),
        sa.Column("lokasi", Geography(geometry_type="POINT", srid=4326, spatial_index=False)),
        sa.Column("status_verifikasi", sa.String, nullable=False, server_default="menunggu"),
        sa.Column("diverifikasi_oleh", UUID(as_uuid=True), sa.ForeignKey("pengguna.id")),
        _dibuat(),
        _diperbarui(),
        sa.Column("dihapus_pada", TS),
        sa.CheckConstraint(
            "status_verifikasi IN ('menunggu','terverifikasi','ditolak')",
            name="ck_umkm_status_verifikasi",
        ),
    )
    op.create_index("ix_umkm_lokasi_gist", "umkm", ["lokasi"], postgresql_using="gist")
    op.create_index("ix_umkm_desa_status", "umkm", ["desa_id", "status_verifikasi", "bidang_id"])

    # --- ALTER F0: layanan.umkm_id ---
    op.add_column("layanan", sa.Column("umkm_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_layanan_umkm", "layanan", "umkm", ["umkm_id"], ["id"])

    # --- produk_jasa ---
    op.create_table(
        "produk_jasa",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("umkm_id", UUID(as_uuid=True), sa.ForeignKey("umkm.id"), nullable=False),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("jenis", sa.String, nullable=False),
        sa.Column("harga", sa.Numeric, nullable=False),
        sa.Column("satuan_harga", sa.String, nullable=False),
        sa.Column("stok", sa.Integer),
        sa.Column("status", sa.String, nullable=False, server_default="draft"),
        _dibuat(),
        _diperbarui(),
        sa.Column("dihapus_pada", TS),
        sa.CheckConstraint("jenis IN ('produk','jasa')", name="ck_produk_jenis"),
        sa.CheckConstraint("status IN ('draft','publikasi','arsip')", name="ck_produk_status"),
    )
    op.create_index("ix_produk_desa_umkm_status", "produk_jasa", ["desa_id", "umkm_id", "status"])

    # --- paket_wisata ---
    op.create_table(
        "paket_wisata",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("agen_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("slug", sa.String, nullable=False),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("durasi_jam", sa.Integer, nullable=False),
        sa.Column("harga", sa.Numeric, nullable=False),
        sa.Column("satuan_harga", sa.String, nullable=False),
        sa.Column("kuota_default", sa.Integer, server_default="0"),
        sa.Column("status", sa.String, nullable=False, server_default="draft"),
        _dibuat(),
        _diperbarui(),
        sa.Column("dihapus_pada", TS),
        sa.UniqueConstraint("desa_id", "slug", name="uq_paket_desa_slug"),
        sa.CheckConstraint(
            "status IN ('draft','review','publikasi','ditolak','arsip')",
            name="ck_paket_status",
        ),
    )
    op.create_index("ix_paket_desa_status", "paket_wisata", ["desa_id", "status"])

    # --- paket_item ---
    op.create_table(
        "paket_item",
        _uid_col(),
        sa.Column("paket_id", UUID(as_uuid=True), sa.ForeignKey("paket_wisata.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hari", sa.SmallInteger, nullable=False),
        sa.Column("urutan", sa.SmallInteger, nullable=False),
        sa.Column("judul", sa.String),
        sa.Column("deskripsi", sa.Text),
        sa.Column("destinasi_id", UUID(as_uuid=True), sa.ForeignKey("destinasi.id")),
        sa.Column("layanan_id", UUID(as_uuid=True), sa.ForeignKey("layanan.id")),
        sa.Column("produk_jasa_id", UUID(as_uuid=True), sa.ForeignKey("produk_jasa.id")),
        sa.Column("durasi_menit", sa.Integer, server_default="0"),
    )
    op.create_index("ix_paket_item_urut", "paket_item", ["paket_id", "hari", "urutan"])

    # --- kontribusi ---
    op.create_table(
        "kontribusi",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("penyumbang_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("tipe", sa.String, nullable=False),
        sa.Column("target_tipe", sa.String, nullable=False),
        sa.Column("target_id", UUID(as_uuid=True)),
        sa.Column("muatan", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("media_id", UUID(as_uuid=True), sa.ForeignKey("media.id")),
        sa.Column("status", sa.String, nullable=False, server_default="menunggu"),
        _dibuat(),
        _diperbarui(),
        sa.CheckConstraint(
            "tipe IN ('foto','tips','koreksi_data','spot_baru','ulasan')",
            name="ck_kontribusi_tipe",
        ),
        sa.CheckConstraint(
            "target_tipe IN ('destinasi','layanan','umkm','paket_wisata','desa')",
            name="ck_kontribusi_target_tipe",
        ),
        sa.CheckConstraint(
            "status IN ('menunggu','disetujui','ditolak','revisi')",
            name="ck_kontribusi_status",
        ),
    )
    op.create_index("ix_kontribusi_desa_status", "kontribusi", ["desa_id", "status"])

    # --- kurasi_log ---
    op.create_table(
        "kurasi_log",
        _uid_col(),
        sa.Column("entitas_tipe", sa.String, nullable=False),
        sa.Column("entitas_id", UUID(as_uuid=True), nullable=False),
        sa.Column("dari_status", sa.String, nullable=False),
        sa.Column("ke_status", sa.String, nullable=False),
        sa.Column("kurator_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("keputusan", sa.String, nullable=False),
        sa.Column("catatan", sa.Text),
        _dibuat(),
        sa.CheckConstraint(
            "entitas_tipe IN ('kontribusi','paket_wisata','produk_jasa','umkm','pengajuan_kartu')",
            name="ck_kurasi_entitas_tipe",
        ),
        sa.CheckConstraint(
            "keputusan IN ('setuju','tolak','minta_revisi','ajukan')",
            name="ck_kurasi_keputusan",
        ),
    )
    op.create_index("ix_kurasi_entitas", "kurasi_log", ["entitas_tipe", "entitas_id"])

    # --- aturan_poin ---
    op.create_table(
        "aturan_poin",
        sa.Column("id", sa.SmallInteger, primary_key=True, autoincrement=True),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id")),
        sa.Column("kode_aksi", sa.String, nullable=False),
        sa.Column("poin", sa.Integer, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("aktif", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.UniqueConstraint("desa_id", "kode_aksi", name="uq_aturan_poin_desa_kode"),
    )

    # --- transaksi_poin ---
    op.create_table(
        "transaksi_poin",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("aturan_id", sa.SmallInteger, sa.ForeignKey("aturan_poin.id")),
        sa.Column("kode_aksi", sa.String, nullable=False),
        sa.Column("poin", sa.Integer, nullable=False),
        sa.Column("referensi_tipe", sa.String),
        sa.Column("referensi_id", UUID(as_uuid=True)),
        _dibuat(),
        sa.UniqueConstraint(
            "pengguna_id", "kode_aksi", "referensi_tipe", "referensi_id",
            name="uq_transaksi_poin_award",
        ),
    )
    op.create_index("ix_transaksi_desa_pengguna", "transaksi_poin", ["desa_id", "pengguna_id"])
    op.create_index("ix_transaksi_desa_dibuat", "transaksi_poin", ["desa_id", "dibuat_pada"])

    # --- badge ---
    op.create_table(
        "badge",
        sa.Column("id", sa.SmallInteger, primary_key=True, autoincrement=True),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id")),
        sa.Column("kode", sa.String, nullable=False, unique=True),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("ikon", sa.String),
        sa.Column("tingkat", sa.SmallInteger, server_default="1"),
        sa.Column("syarat", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("aktif", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )

    # --- badge_pengguna ---
    op.create_table(
        "badge_pengguna",
        _uid_col(),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("badge_id", sa.SmallInteger, sa.ForeignKey("badge.id"), nullable=False),
        sa.Column("diperoleh_pada", TS, server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("pengguna_id", "badge_id", name="uq_badge_pengguna"),
    )

    # --- kartu_aksi ---
    op.create_table(
        "kartu_aksi",
        sa.Column("id", sa.SmallInteger, primary_key=True, autoincrement=True),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id")),
        sa.Column("kode", sa.String, nullable=False, unique=True),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("kenapa_penting", sa.Text),
        sa.Column("bukti_dibutuhkan", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("bobot", sa.SmallInteger, server_default="0"),
        sa.Column("aktif", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )

    # --- pengajuan_kartu ---
    op.create_table(
        "pengajuan_kartu",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("subjek_tipe", sa.String, nullable=False),
        sa.Column("subjek_id", UUID(as_uuid=True), nullable=False),
        sa.Column("kartu_id", sa.SmallInteger, sa.ForeignKey("kartu_aksi.id"), nullable=False),
        sa.Column("bukti", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String, nullable=False, server_default="menunggu"),
        sa.Column("validator_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id")),
        sa.Column("catatan", sa.Text),
        _dibuat(),
        sa.Column("divalidasi_pada", TS),
        sa.CheckConstraint("subjek_tipe IN ('umkm','agen','pokdarwis')", name="ck_pengajuan_subjek_tipe"),
        sa.CheckConstraint(
            "status IN ('menunggu','tervalidasi','ditolak','revisi')",
            name="ck_pengajuan_status",
        ),
    )
    op.create_index("ix_pengajuan_subjek", "pengajuan_kartu", ["desa_id", "subjek_tipe", "subjek_id"])

    # --- sertifikasi_owner ---
    op.create_table(
        "sertifikasi_owner",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("subjek_tipe", sa.String, nullable=False),
        sa.Column("subjek_id", UUID(as_uuid=True), nullable=False),
        sa.Column("tingkat", sa.String, nullable=False),
        sa.Column("skor", sa.SmallInteger, server_default="0"),
        sa.Column("diperbarui_pada", TS, server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("desa_id", "subjek_tipe", "subjek_id", name="uq_sertifikasi_owner"),
        sa.CheckConstraint(
            "tingkat IN ('tunas','bahari','lumba_lumba')",
            name="ck_sertifikasi_tingkat",
        ),
    )

    # --- ALTER F0: perluas media_lampiran.entitas_tipe ---
    op.drop_constraint("ck_lampiran_entitas", "media_lampiran", type_="check")
    op.create_check_constraint(
        "ck_lampiran_entitas",
        "media_lampiran",
        "entitas_tipe IN ('destinasi','layanan','desa','pengguna',"
        "'umkm','produk_jasa','paket_wisata','kontribusi')",
    )

    _seed()


def _seed() -> None:
    bind = op.get_bind()

    bidang = sa.table("bidang_usaha", sa.column("kode", sa.String), sa.column("nama", sa.String), sa.column("ikon", sa.String))
    op.bulk_insert(bidang, [
        {"kode": "kuliner", "nama": "Kuliner", "ikon": "🍲"},
        {"kode": "kerajinan", "nama": "Kerajinan", "ikon": "🧺"},
        {"kode": "homestay", "nama": "Homestay", "ikon": "🏠"},
        {"kode": "jasa_wisata", "nama": "Jasa Wisata", "ikon": "⛵"},
        {"kode": "hasil_laut", "nama": "Hasil Laut", "ikon": "🐟"},
    ])

    aturan = sa.table(
        "aturan_poin",
        sa.column("desa_id", UUID),
        sa.column("kode_aksi", sa.String),
        sa.column("poin", sa.Integer),
        sa.column("deskripsi", sa.Text),
        sa.column("aktif", sa.Boolean),
    )
    op.bulk_insert(aturan, [
        {"desa_id": None, "kode_aksi": "kontribusi_disetujui", "poin": 20, "deskripsi": "Kontribusi disetujui kurator", "aktif": True},
        {"desa_id": None, "kode_aksi": "produk_terdaftar", "poin": 10, "deskripsi": "Produk/jasa pertama terdaftar", "aktif": True},
        {"desa_id": None, "kode_aksi": "paket_dipublikasi", "poin": 30, "deskripsi": "Paket wisata dipublikasi", "aktif": True},
        {"desa_id": None, "kode_aksi": "profil_lengkap", "poin": 15, "deskripsi": "Profil UMKM lengkap", "aktif": True},
        {"desa_id": None, "kode_aksi": "warga_perintis", "poin": 50, "deskripsi": "Warga perintis platform", "aktif": True},
    ])

    badge = sa.table(
        "badge",
        sa.column("desa_id", UUID),
        sa.column("kode", sa.String),
        sa.column("nama", sa.String),
        sa.column("deskripsi", sa.Text),
        sa.column("ikon", sa.String),
        sa.column("tingkat", sa.SmallInteger),
        sa.column("syarat", JSONB),
        sa.column("aktif", sa.Boolean),
    )
    op.bulk_insert(badge, [
        {"desa_id": None, "kode": "penjelajah", "nama": "Penjelajah", "deskripsi": "Kontribusi pertama",
         "ikon": "🧭", "tingkat": 1, "syarat": json.dumps({"poin_min": 20}), "aktif": True},
        {"desa_id": None, "kode": "kurator_warga", "nama": "Kurator Warga", "deskripsi": "10 kontribusi disetujui",
         "ikon": "⭐", "tingkat": 2, "syarat": json.dumps({"aksi": "kontribusi_disetujui", "jumlah": 10}), "aktif": True},
        {"desa_id": None, "kode": "pelopor", "nama": "Pelopor", "deskripsi": "50 poin di desa",
         "ikon": "🏅", "tingkat": 3, "syarat": json.dumps({"poin_min": 50}), "aktif": True},
    ])

    kartu = sa.table(
        "kartu_aksi",
        sa.column("desa_id", UUID),
        sa.column("kode", sa.String),
        sa.column("nama", sa.String),
        sa.column("deskripsi", sa.Text),
        sa.column("kenapa_penting", sa.Text),
        sa.column("bukti_dibutuhkan", JSONB),
        sa.column("bobot", sa.SmallInteger),
        sa.column("aktif", sa.Boolean),
    )
    op.bulk_insert(kartu, [
        {"desa_id": None, "kode": "pilah_sampah", "nama": "Pilah Sampah", "deskripsi": "Memilah sampah di usaha",
         "kenapa_penting": "Sampah terpilah mengurangi beban ekosistem pesisir.",
         "bukti_dibutuhkan": json.dumps({"foto": True, "pernyataan": True}), "bobot": 15, "aktif": True},
        {"desa_id": None, "kode": "hemat_air", "nama": "Hemat Air", "deskripsi": "Menghemat penggunaan air",
         "kenapa_penting": "Air bersih langka; hemat air = lestari sumber daya.",
         "bukti_dibutuhkan": json.dumps({"pernyataan": True}), "bobot": 10, "aktif": True},
        {"desa_id": None, "kode": "edukasi_tamu", "nama": "Edukasi Tamu", "deskripsi": "Mengedukasi tamu soal konservasi",
         "kenapa_penting": "Tamu yang sadar lingkungan menjaga daya dukung destinasi.",
         "bukti_dibutuhkan": json.dumps({"foto": True, "dokumen": False, "pernyataan": True}), "bobot": 20, "aktif": True},
        {"desa_id": None, "kode": "energi_bersih", "nama": "Energi Bersih", "deskripsi": "Beralih ke sumber energi ramah lingkungan",
         "kenapa_penting": "Energi bersih menurunkan jejak karbon wisata.",
         "bukti_dibutuhkan": json.dumps({"foto": True, "pernyataan": True}), "bobot": 25, "aktif": True},
    ])


def downgrade() -> None:
    op.drop_constraint("ck_lampiran_entitas", "media_lampiran", type_="check")
    op.create_check_constraint(
        "ck_lampiran_entitas",
        "media_lampiran",
        "entitas_tipe IN ('destinasi','layanan','desa','pengguna')",
    )

    for t in (
        "sertifikasi_owner",
        "pengajuan_kartu",
        "badge_pengguna",
        "transaksi_poin",
        "badge",
        "aturan_poin",
        "kurasi_log",
        "kontribusi",
        "paket_item",
        "paket_wisata",
        "produk_jasa",
    ):
        op.drop_table(t)

    op.drop_constraint("fk_layanan_umkm", "layanan", type_="foreignkey")
    op.drop_column("layanan", "umkm_id")
    op.drop_table("umkm")
    op.drop_table("bidang_usaha")
