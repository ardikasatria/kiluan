"""0012 — Seed akun demo per peran (Teluk Kiluan).

Revision ID: 0012_seed_demo_akun
Revises: 0011_f3
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app.domain.seed_demo_akun import (
    DEMO_AKUN,
    DEMO_UMKM_ENTITAS_ID,
    DEMO_UMKM_ID,
    DESA_SLUG,
    hash_sandi_demo,
)

revision = "0012_seed_demo_akun"
down_revision = "0011_f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    sandi_hash = hash_sandi_demo()

    for akun in DEMO_AKUN:
        bind.execute(
            sa.text(
                "INSERT INTO pengguna (id, email, nama, kata_sandi_hash, status, email_terverifikasi_pada) "
                "VALUES (:id, :email, :nama, :hash, 'aktif', now()) "
                "ON CONFLICT (email) DO NOTHING"
            ),
            {
                "id": str(akun["id"]),
                "email": akun["email"],
                "nama": akun["nama"],
                "hash": sandi_hash,
            },
        )

        desa_id = None
        if akun["scoped_desa"]:
            row = bind.execute(
                sa.text("SELECT id FROM desa WHERE slug = :slug LIMIT 1"),
                {"slug": DESA_SLUG},
            ).fetchone()
            if row is None:
                continue
            desa_id = str(row[0])

        bind.execute(
            sa.text(
                "INSERT INTO keanggotaan (id, pengguna_id, desa_id, peran_id, status) "
                "VALUES (:kid, :pid, :did, :peran_id, 'aktif') "
                "ON CONFLICT (pengguna_id, desa_id, peran_id) DO NOTHING"
            ),
            {
                "kid": str(akun["keanggotaan_id"]),
                "pid": str(akun["id"]),
                "did": desa_id,
                "peran_id": akun["peran_id"],
            },
        )

    # Entitas UMKM agar modul katalog/kelola tidak kosong total.
    bind.execute(
        sa.text(
            "INSERT INTO umkm "
            "(id, desa_id, pengguna_id, bidang_id, nama, deskripsi, status_verifikasi, dibuat_pada, diperbarui_pada) "
            "SELECT :id, d.id, :pid, 1, :nama, :desk, 'terverifikasi', now(), now() "
            "FROM desa d WHERE d.slug = :slug "
            "ON CONFLICT (id) DO NOTHING"
        ),
        {
            "id": str(DEMO_UMKM_ENTITAS_ID),
            "pid": str(DEMO_UMKM_ID),
            "nama": "Warung Demo Kiluan",
            "desk": "UMKM demo untuk uji dasbor penyedia ekonomi.",
            "slug": DESA_SLUG,
        },
    )


def downgrade() -> None:
    bind = op.get_bind()
    emails = [a["email"] for a in DEMO_AKUN]
    bind.execute(
        sa.text("DELETE FROM umkm WHERE id = :id"),
        {"id": str(DEMO_UMKM_ENTITAS_ID)},
    )
    bind.execute(
        sa.text("DELETE FROM keanggotaan WHERE pengguna_id IN (SELECT id FROM pengguna WHERE email = ANY(:emails))"),
        {"emails": emails},
    )
    bind.execute(
        sa.text("DELETE FROM pengguna WHERE email = ANY(:emails)"),
        {"emails": emails},
    )
