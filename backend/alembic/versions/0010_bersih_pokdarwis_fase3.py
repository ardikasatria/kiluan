"""0010 — Fase 3: hapus pokdarwis dari subjek_tipe (setelah migrasi 0009).

Revision ID: 0010_bersih_pokdarwis_fase3
Revises: 0009_lebur_pokdarwis_kontributor
"""
from __future__ import annotations

from alembic import op

revision = "0010_bersih_pokdarwis_fase3"
down_revision = "0009_lebur_pokdarwis_kontributor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_pengajuan_subjek_tipe", "pengajuan_kartu", type_="check")
    op.create_check_constraint(
        "ck_pengajuan_subjek_tipe",
        "pengajuan_kartu",
        "subjek_tipe IN ('umkm','agen','kontributor')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_pengajuan_subjek_tipe", "pengajuan_kartu", type_="check")
    op.create_check_constraint(
        "ck_pengajuan_subjek_tipe",
        "pengajuan_kartu",
        "subjek_tipe IN ('umkm','agen','kontributor','pokdarwis')",
    )
