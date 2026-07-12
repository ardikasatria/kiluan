"""0006 — Simpanan (wishlist wisata + misi).

Revision ID: 0006_simpanan
Revises: 0005_warta_genta
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID

revision = "0006_simpanan"
down_revision = "0005_warta_genta"
branch_labels = None
depends_on = None

TS = TIMESTAMP(timezone=True)


def upgrade() -> None:
    op.create_table(
        "simpanan",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("tipe", sa.String, nullable=False),
        sa.Column("entitas_id", UUID(as_uuid=True), nullable=False),
        sa.Column("catatan", sa.Text),
        sa.Column("dibuat_pada", TS, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "tipe IN ('destinasi','paket','misi')",
            name="ck_simpanan_tipe",
        ),
        sa.UniqueConstraint("pengguna_id", "tipe", "entitas_id", name="uq_simpanan_pengguna_entitas"),
    )
    op.create_index(
        "ix_simpanan_pengguna_dibuat",
        "simpanan",
        ["pengguna_id", "dibuat_pada", "id"],
    )


def downgrade() -> None:
    op.drop_index("ix_simpanan_pengguna_dibuat", table_name="simpanan")
    op.drop_table("simpanan")
