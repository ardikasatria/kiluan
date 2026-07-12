"""0008 — Seed Penjelajah Lestari demo: stasiun + misi Teluk Kiluan.

Revision ID: 0008_seed_penjelajah_kiluan
Revises: 0007_keanggotaan_simpanan
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app.domain.seed_penjelajah import DESA_SLUG, MISI, STASIUN, dump_json

revision = "0008_seed_penjelajah_kiluan"
down_revision = "0007_keanggotaan_simpanan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    for st in STASIUN:
        bind.execute(
            sa.text(
                "INSERT INTO stasiun_lestari "
                "(id, desa_id, nama, tipe, qr_token, radius_m, aktif, lokasi, dibuat_pada) "
                "SELECT :id, d.id, :nama, :tipe, :qr, :radius, true, "
                "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, now() "
                "FROM desa d WHERE d.slug = :slug "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {
                "id": str(st["id"]),
                "nama": st["nama"],
                "tipe": st["tipe"],
                "qr": st["qr_token"],
                "radius": st["radius_m"],
                "lat": st["lat"],
                "lng": st["lng"],
                "slug": DESA_SLUG,
            },
        )

    for m in MISI:
        bind.execute(
            sa.text(
                "INSERT INTO misi "
                "(id, desa_id, kode, judul, deskripsi, jenis, kategori, micro_lesson, "
                "syarat_verifikasi, stasiun_id, poin, dampak_template, aktif, dibuat_pada) "
                "SELECT gen_random_uuid(), d.id, :kode, :judul, :deskripsi, :jenis, :kategori, "
                "CAST(:micro AS jsonb), CAST(:syarat AS jsonb), :stasiun_id, :poin, "
                "CAST(:dampak AS jsonb), true, now() "
                "FROM desa d WHERE d.slug = :slug "
                "ON CONFLICT (kode) DO NOTHING"
            ),
            {
                "kode": m["kode"],
                "judul": m["judul"],
                "deskripsi": m["deskripsi"],
                "jenis": m["jenis"],
                "kategori": m["kategori"],
                "micro": dump_json(m["micro_lesson"]) if m["micro_lesson"] else None,
                "syarat": dump_json(m["syarat_verifikasi"]),
                "stasiun_id": str(m["stasiun_id"]) if m["stasiun_id"] else None,
                "poin": m["poin"],
                "dampak": dump_json(m["dampak_template"]),
                "slug": DESA_SLUG,
            },
        )


def downgrade() -> None:
    bind = op.get_bind()
    for m in MISI:
        bind.execute(sa.text("DELETE FROM misi WHERE kode = :kode"), {"kode": m["kode"]})
    for st in STASIUN:
        bind.execute(sa.text("DELETE FROM stasiun_lestari WHERE id = :id"), {"id": str(st["id"])})
