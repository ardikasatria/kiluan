"""0009 — Peleburan pokdarwis → kontributor (fase 2: migrasi data).

Revision ID: 0009_lebur_pokdarwis_kontributor
Revises: 0008_seed_penjelajah_kiluan
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009_lebur_pokdarwis_kontributor"
down_revision = "0008_seed_penjelajah_kiluan"
branch_labels = None
depends_on = None

# Konsisten dengan PERAN_ID di app/model/tabel.py
_ID_POKDARWIS = 2
_ID_KONTRIBUTOR = 5


def upgrade() -> None:
    bind = op.get_bind()

    # Gabung status aktif bila pengguna punya kedua peran di desa yang sama.
    bind.execute(
        sa.text(
            """
            UPDATE keanggotaan k_kon
            SET status = 'aktif', diperbarui_pada = NOW()
            FROM keanggotaan k_pok
            WHERE k_kon.peran_id = :id_kontributor
              AND k_pok.peran_id = :id_pokdarwis
              AND k_kon.pengguna_id = k_pok.pengguna_id
              AND k_kon.desa_id IS NOT DISTINCT FROM k_pok.desa_id
              AND k_pok.status = 'aktif'
              AND k_kon.status <> 'aktif'
            """
        ),
        {"id_kontributor": _ID_KONTRIBUTOR, "id_pokdarwis": _ID_POKDARWIS},
    )

    # Hapus baris pokdarwis yang bentrok (kontributor sudah ada).
    bind.execute(
        sa.text(
            """
            DELETE FROM keanggotaan k_pok
            WHERE k_pok.peran_id = :id_pokdarwis
              AND EXISTS (
                SELECT 1 FROM keanggotaan k_kon
                WHERE k_kon.peran_id = :id_kontributor
                  AND k_kon.pengguna_id = k_pok.pengguna_id
                  AND k_kon.desa_id IS NOT DISTINCT FROM k_pok.desa_id
              )
            """
        ),
        {"id_kontributor": _ID_KONTRIBUTOR, "id_pokdarwis": _ID_POKDARWIS},
    )

    # Sisa keanggotaan pokdarwis → kontributor.
    bind.execute(
        sa.text("UPDATE keanggotaan SET peran_id = :id_kontributor WHERE peran_id = :id_pokdarwis"),
        {"id_kontributor": _ID_KONTRIBUTOR, "id_pokdarwis": _ID_POKDARWIS},
    )

    bind.execute(
        sa.text(
            "UPDATE pengajuan_kartu SET subjek_tipe = 'kontributor' WHERE subjek_tipe = 'pokdarwis'"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE sertifikasi_owner SET subjek_tipe = 'kontributor' WHERE subjek_tipe = 'pokdarwis'"
        )
    )

    bind.execute(
        sa.text(
            """
            UPDATE peran
            SET nama = 'Kontributor',
                deskripsi = 'Kontributor & pengelola desa — kontribusi data dan kurasi operasional',
                scoped_desa = TRUE
            WHERE id = :id_kontributor
            """
        ),
        {"id_kontributor": _ID_KONTRIBUTOR},
    )
    bind.execute(
        sa.text(
            """
            UPDATE peran
            SET nama = 'Pokdarwis (arsip)',
                deskripsi = 'Peran digabung ke kontributor — tidak dipakai untuk keanggotaan baru'
            WHERE id = :id_pokdarwis
            """
        ),
        {"id_pokdarwis": _ID_POKDARWIS},
    )

    op.drop_constraint("ck_pengajuan_subjek_tipe", "pengajuan_kartu", type_="check")
    op.create_check_constraint(
        "ck_pengajuan_subjek_tipe",
        "pengajuan_kartu",
        "subjek_tipe IN ('umkm','agen','kontributor','pokdarwis')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_pengajuan_subjek_tipe", "pengajuan_kartu", type_="check")
    op.create_check_constraint(
        "ck_pengajuan_subjek_tipe",
        "pengajuan_kartu",
        "subjek_tipe IN ('umkm','agen','pokdarwis')",
    )

    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE peran
            SET nama = 'Kontributor Umum', deskripsi = NULL, scoped_desa = FALSE
            WHERE id = :id_kontributor
            """
        ),
        {"id_kontributor": _ID_KONTRIBUTOR},
    )
    bind.execute(
        sa.text(
            "UPDATE peran SET nama = 'Pokdarwis', deskripsi = NULL WHERE id = :id_pokdarwis"
        ),
        {"id_pokdarwis": _ID_POKDARWIS},
    )
    # Tidak memulihkan keanggotaan — migrasi satu arah di produksi.
