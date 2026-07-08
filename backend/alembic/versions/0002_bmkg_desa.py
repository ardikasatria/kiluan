"""0002 — kode BMKG pada desa (cuaca darat & maritim).

Revision ID: 0002_bmkg_desa
Revises: 0001_bootstrap_f0
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_bmkg_desa"
down_revision = "0001_bootstrap_f0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("desa", sa.Column("kode_bmkg_adm4", sa.String(), nullable=True))
    op.add_column("desa", sa.Column("kode_perairan_bmkg", sa.String(), nullable=True))

    # Seed Teluk Kiluan — Kiluan Negeri, Kelumbayan, Tanggamus, Lampung.
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE desa SET kode_bmkg_adm4 = :adm4, kode_perairan_bmkg = :perairan "
            "WHERE slug = :slug"
        ),
        {
            "adm4": "18.06.17.2012",
            "perairan": "S.18.3",
            "slug": "teluk-kiluan",
        },
    )


def downgrade() -> None:
    op.drop_column("desa", "kode_perairan_bmkg")
    op.drop_column("desa", "kode_bmkg_adm4")
