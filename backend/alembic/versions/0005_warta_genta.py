"""0005 — Warta (Berita/Blog) + Genta (Notifikasi + outbox peristiwa).

Revision ID: 0005_warta_genta
Revises: 0004_f2
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID

revision = "0005_warta_genta"
down_revision = "0004_f2"
branch_labels = None
depends_on = None

TS = TIMESTAMP(timezone=True)

JENIS_PERISTIWA = (
    "pembayaran_menunggu_konfirmasi",
    "pembayaran_berhasil",
    "pesanan_dibayar",
    "booking_terkonfirmasi",
    "booking_checkin",
    "pesanan_selesai",
    "transaksi_dirilis",
    "payout_dibuat",
    "payout_berhasil",
    "refund_diajukan",
    "refund_selesai",
    "tukar_poin_berhasil",
    "stempel_terverifikasi",
)


def _uid_col():
    return sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _dibuat():
    return sa.Column("dibuat_pada", TS, server_default=sa.text("now()"), nullable=False)


def _diperbarui():
    return sa.Column("diperbarui_pada", TS, server_default=sa.text("now()"), nullable=False)


def upgrade() -> None:
    op.create_table(
        "berita",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("penulis_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("slug", sa.Text, nullable=False),
        sa.Column("judul", sa.Text, nullable=False),
        sa.Column("ringkasan", sa.Text),
        sa.Column("konten", sa.Text, nullable=False, server_default=""),
        sa.Column("sampul_media_id", UUID(as_uuid=True), sa.ForeignKey("media.id")),
        sa.Column("kategori", sa.Text, nullable=False, server_default="lainnya"),
        sa.Column("status", sa.Text, nullable=False, server_default="draft"),
        sa.Column("terbit_pada", TS),
        sa.Column("sorotan", sa.Boolean, nullable=False, server_default=sa.text("false")),
        _dibuat(),
        _diperbarui(),
        sa.Column("dihapus_pada", TS),
        sa.UniqueConstraint("desa_id", "slug", name="uq_berita_desa_slug"),
        sa.CheckConstraint(
            "kategori IN ('pengumuman','cerita','konservasi','acara','panduan','lainnya')",
            name="ck_berita_kategori",
        ),
        sa.CheckConstraint(
            "status IN ('draft','publikasi','arsip')",
            name="ck_berita_status",
        ),
    )
    op.create_index("ix_berita_desa_status_terbit", "berita", ["desa_id", "status", sa.text("terbit_pada DESC")])
    op.create_index(
        "ix_berita_desa_sorotan",
        "berita",
        ["desa_id", "sorotan"],
        postgresql_where=sa.text("dihapus_pada IS NULL"),
    )

    op.create_table(
        "berita_tag",
        sa.Column("berita_id", UUID(as_uuid=True), sa.ForeignKey("berita.id"), primary_key=True),
        sa.Column("tag_id", sa.SmallInteger, sa.ForeignKey("tag.id"), primary_key=True),
    )

    jenis_check = "jenis IN (" + ",".join(f"'{j}'" for j in JENIS_PERISTIWA) + ")"
    op.create_table(
        "peristiwa",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("jenis", sa.Text, nullable=False),
        sa.Column("entitas_tipe", sa.Text, nullable=False),
        sa.Column("entitas_id", UUID(as_uuid=True), nullable=False),
        sa.Column("muatan", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        _dibuat(),
        sa.Column("diproses_pada", TS),
        sa.CheckConstraint(jenis_check, name="ck_peristiwa_jenis"),
    )
    op.create_index(
        "ix_peristiwa_belum_diproses",
        "peristiwa",
        ["diproses_pada"],
        postgresql_where=sa.text("diproses_pada IS NULL"),
    )
    op.create_index("ix_peristiwa_desa_entitas", "peristiwa", ["desa_id", "entitas_tipe", "entitas_id"])

    op.create_table(
        "notifikasi",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("penerima_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("peristiwa_id", UUID(as_uuid=True), sa.ForeignKey("peristiwa.id")),
        sa.Column("tipe", sa.Text, nullable=False),
        sa.Column("judul", sa.Text, nullable=False),
        sa.Column("isi", sa.Text, nullable=False),
        sa.Column("entitas_tipe", sa.Text, nullable=False),
        sa.Column("entitas_id", UUID(as_uuid=True), nullable=False),
        sa.Column("kanal", sa.Text, nullable=False, server_default="in_app"),
        sa.Column("status", sa.Text, nullable=False, server_default="belum_dibaca"),
        _dibuat(),
        sa.Column("dibaca_pada", TS),
        sa.CheckConstraint("kanal IN ('in_app','email')", name="ck_notifikasi_kanal"),
        sa.CheckConstraint("status IN ('belum_dibaca','dibaca')", name="ck_notifikasi_status"),
        sa.UniqueConstraint("peristiwa_id", "penerima_id", "tipe", name="uq_notifikasi_peristiwa_penerima_tipe"),
    )
    op.create_index(
        "ix_notifikasi_inbox",
        "notifikasi",
        ["desa_id", "penerima_id", "status", sa.text("dibuat_pada DESC")],
    )

    op.drop_constraint("ck_lampiran_entitas", "media_lampiran", type_="check")
    op.create_check_constraint(
        "ck_lampiran_entitas",
        "media_lampiran",
        "entitas_tipe IN ('destinasi','layanan','desa','pengguna',"
        "'umkm','produk_jasa','paket_wisata','kontribusi','berita')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_lampiran_entitas", "media_lampiran", type_="check")
    op.create_check_constraint(
        "ck_lampiran_entitas",
        "media_lampiran",
        "entitas_tipe IN ('destinasi','layanan','desa','pengguna',"
        "'umkm','produk_jasa','paket_wisata','kontribusi')",
    )

    op.drop_index("ix_notifikasi_inbox", table_name="notifikasi")
    op.drop_table("notifikasi")
    op.drop_index("ix_peristiwa_desa_entitas", table_name="peristiwa")
    op.drop_index("ix_peristiwa_belum_diproses", table_name="peristiwa")
    op.drop_table("peristiwa")
    op.drop_table("berita_tag")
    op.drop_index("ix_berita_desa_sorotan", table_name="berita")
    op.drop_index("ix_berita_desa_status_terbit", table_name="berita")
    op.drop_table("berita")
