"""0007 — Keanggotaan revisi + simpanan produk.

Revision ID: 0007_keanggotaan_revisi_produk_simpanan
Revises: 0006_simpanan
"""
from __future__ import annotations

from alembic import op

revision = "0007_keanggotaan_revisi_produk_simpanan"
down_revision = "0006_simpanan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_keanggotaan_status", "keanggotaan", type_="check")
    op.create_check_constraint(
        "ck_keanggotaan_status",
        "keanggotaan",
        "status IN ('aktif','menunggu','ditolak','revisi','nonaktif')",
    )

    op.drop_constraint("ck_simpanan_tipe", "simpanan", type_="check")
    op.create_check_constraint(
        "ck_simpanan_tipe",
        "simpanan",
        "tipe IN ('destinasi','paket','misi','produk')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_simpanan_tipe", "simpanan", type_="check")
    op.create_check_constraint(
        "ck_simpanan_tipe",
        "simpanan",
        "tipe IN ('destinasi','paket','misi')",
    )

    op.drop_constraint("ck_keanggotaan_status", "keanggotaan", type_="check")
    op.create_check_constraint(
        "ck_keanggotaan_status",
        "keanggotaan",
        "status IN ('aktif','menunggu','ditolak','nonaktif')",
    )
