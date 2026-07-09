"""0004 — Fase 2: Dermaga, Kupon & Poin, Penjelajah Lestari, Pemandu.

Revision ID: 0004_f2
Revises: 0003_f1
"""
from __future__ import annotations

import json
import uuid

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID

revision = "0004_f2"
down_revision = "0003_f1"
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
    # --- pengaturan_desa ---
    op.create_table(
        "pengaturan_desa",
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), primary_key=True),
        sa.Column("persen_reinvestasi", sa.Numeric, nullable=False),
        sa.Column("persen_fee_platform", sa.Numeric, nullable=False),
        sa.Column("kebijakan_pembatalan", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("batas_hold_menit", sa.SmallInteger, nullable=False, server_default="30"),
        sa.Column("gateway", sa.String, nullable=False, server_default="manual"),
        sa.Column("konfig_gateway", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("diperbarui_pada", TS, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "gateway IN ('midtrans','xendit','manual')",
            name="ck_pengaturan_gateway",
        ),
    )

    # --- katalog_hadiah ---
    op.create_table(
        "katalog_hadiah",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id")),
        sa.Column("kode", sa.String, nullable=False, unique=True),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("jenis", sa.String, nullable=False),
        sa.Column("biaya_poin", sa.Integer, nullable=False),
        sa.Column("stok", sa.Integer),
        sa.Column("syarat", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("media_id", UUID(as_uuid=True), sa.ForeignKey("media.id")),
        sa.Column("aktif", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("berlaku_mulai", sa.Date),
        sa.Column("berlaku_sampai", sa.Date),
        sa.CheckConstraint(
            "jenis IN ('kupon_diskon','merchandise','tiket','donasi')",
            name="ck_katalog_hadiah_jenis",
        ),
    )

    # --- kupon ---
    op.create_table(
        "kupon",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("kode", sa.String, nullable=False, unique=True),
        sa.Column("pemilik_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id")),
        sa.Column("sumber", sa.String, nullable=False),
        sa.Column("tipe_diskon", sa.String, nullable=False),
        sa.Column("nilai", sa.Numeric, nullable=False),
        sa.Column("min_belanja", sa.Numeric),
        sa.Column("batas_pakai", sa.Integer, nullable=False),
        sa.Column("terpakai", sa.Integer, nullable=False, server_default="0"),
        sa.Column("penyedia_terbatas", JSONB),
        sa.Column("berlaku_mulai", TS),
        sa.Column("berlaku_sampai", TS),
        sa.Column("status", sa.String, nullable=False, server_default="aktif"),
        _dibuat(),
        sa.CheckConstraint(
            "sumber IN ('tukar_poin','promo_owner','kampanye')",
            name="ck_kupon_sumber",
        ),
        sa.CheckConstraint(
            "tipe_diskon IN ('persen','nominal')",
            name="ck_kupon_tipe_diskon",
        ),
        sa.CheckConstraint(
            "status IN ('aktif','nonaktif','habis','kedaluwarsa')",
            name="ck_kupon_status",
        ),
    )

    # --- pesanan ---
    op.create_table(
        "pesanan",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pembeli_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("kode_pesanan", sa.String, nullable=False, unique=True),
        sa.Column("status", sa.String, nullable=False, server_default="menunggu_pembayaran"),
        sa.Column("metode_ambil", sa.String, nullable=False, server_default="ambil_ditempat"),
        sa.Column("alamat_kirim", JSONB),
        sa.Column("kontak", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("kupon_id", UUID(as_uuid=True), sa.ForeignKey("kupon.id")),
        sa.Column("subtotal", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("diskon", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("ongkir", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("kedaluwarsa_pada", TS),
        _dibuat(),
        _diperbarui(),
        sa.CheckConstraint(
            "status IN ('menunggu_pembayaran','dibayar','diproses','selesai',"
            "'dibatalkan','kedaluwarsa','refund')",
            name="ck_pesanan_status",
        ),
        sa.CheckConstraint(
            "metode_ambil IN ('ambil_ditempat','kirim')",
            name="ck_pesanan_metode_ambil",
        ),
    )
    op.create_index("ix_pesanan_desa_status", "pesanan", ["desa_id", "status", "dibuat_pada"])
    op.create_index("ix_pesanan_pembeli", "pesanan", ["pembeli_id"])

    # --- slot_jadwal ---
    op.create_table(
        "slot_jadwal",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("subjek_tipe", sa.String, nullable=False),
        sa.Column("subjek_id", UUID(as_uuid=True), nullable=False),
        sa.Column("tanggal", sa.Date, nullable=False),
        sa.Column("waktu_mulai", sa.Time),
        sa.Column("waktu_selesai", sa.Time),
        sa.Column("kuota", sa.Integer, nullable=False),
        sa.Column("kuota_terpakai", sa.Integer, nullable=False, server_default="0"),
        sa.Column("harga_override", sa.Numeric),
        sa.Column("status", sa.String, nullable=False, server_default="buka"),
        sa.UniqueConstraint(
            "subjek_tipe", "subjek_id", "tanggal", "waktu_mulai",
            name="uq_slot_subjek_tanggal_waktu",
        ),
        sa.CheckConstraint(
            "subjek_tipe IN ('paket_wisata','layanan')",
            name="ck_slot_subjek_tipe",
        ),
        sa.CheckConstraint(
            "status IN ('buka','tutup','penuh')",
            name="ck_slot_status",
        ),
    )

    # --- pesanan_item ---
    op.create_table(
        "pesanan_item",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pesanan_id", UUID(as_uuid=True), sa.ForeignKey("pesanan.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_tipe", sa.String, nullable=False),
        sa.Column("item_id", UUID(as_uuid=True), nullable=False),
        sa.Column("penyedia_tipe", sa.String, nullable=False),
        sa.Column("penyedia_id", UUID(as_uuid=True), nullable=False),
        sa.Column("nama_snapshot", sa.String, nullable=False),
        sa.Column("harga_snapshot", sa.Numeric, nullable=False),
        sa.Column("jumlah", sa.Integer, nullable=False),
        sa.Column("satuan", sa.String, nullable=False),
        sa.Column("subtotal", sa.Numeric, nullable=False),
        sa.Column("slot_jadwal_id", UUID(as_uuid=True), sa.ForeignKey("slot_jadwal.id")),
        sa.Column("status_fulfillment", sa.String, nullable=False, server_default="menunggu"),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.CheckConstraint(
            "item_tipe IN ('produk_jasa','paket_wisata','layanan','tiket_masuk')",
            name="ck_pesanan_item_tipe",
        ),
        sa.CheckConstraint(
            "penyedia_tipe IN ('umkm','pengguna')",
            name="ck_pesanan_item_penyedia_tipe",
        ),
        sa.CheckConstraint(
            "status_fulfillment IN ('menunggu','disiapkan','dikirim','diterima','diambil','batal')",
            name="ck_pesanan_item_fulfillment",
        ),
    )
    op.create_index("ix_pesanan_item_pesanan", "pesanan_item", ["pesanan_id"])
    op.create_index("ix_pesanan_item_penyedia", "pesanan_item", ["penyedia_tipe", "penyedia_id"])

    # --- booking ---
    op.create_table(
        "booking",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pesanan_item_id", UUID(as_uuid=True), sa.ForeignKey("pesanan_item.id"), nullable=False, unique=True),
        sa.Column("slot_jadwal_id", UUID(as_uuid=True), sa.ForeignKey("slot_jadwal.id"), nullable=False),
        sa.Column("destinasi_id", UUID(as_uuid=True), sa.ForeignKey("destinasi.id")),
        sa.Column("jumlah_orang", sa.Integer, nullable=False),
        sa.Column("tanggal_kunjungan", sa.Date, nullable=False),
        sa.Column("kode_checkin", sa.String, nullable=False, unique=True),
        sa.Column("status", sa.String, nullable=False, server_default="dipesan"),
        sa.Column("checkin_pada", TS),
        _dibuat(),
        sa.CheckConstraint(
            "status IN ('dipesan','terkonfirmasi','checkin','selesai','noshow','batal')",
            name="ck_booking_status",
        ),
    )

    # --- pembayaran ---
    op.create_table(
        "pembayaran",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pesanan_id", UUID(as_uuid=True), sa.ForeignKey("pesanan.id"), nullable=False),
        sa.Column("metode", sa.String, nullable=False),
        sa.Column("penyedia_gateway", sa.String, nullable=False),
        sa.Column("jumlah", sa.Numeric, nullable=False),
        sa.Column("status", sa.String, nullable=False, server_default="menunggu"),
        sa.Column("ref_eksternal", sa.String),
        sa.Column("redirect_url", sa.String),
        sa.Column("bukti_media_id", UUID(as_uuid=True), sa.ForeignKey("media.id")),
        sa.Column("kedaluwarsa_pada", TS),
        sa.Column("dibayar_pada", TS),
        sa.Column("mentah", JSONB, server_default=sa.text("'{}'::jsonb")),
        _dibuat(),
        sa.UniqueConstraint("penyedia_gateway", "ref_eksternal", name="uq_pembayaran_gateway_ref"),
        sa.CheckConstraint(
            "metode IN ('qris','va_bank','ewallet','kartu','transfer_manual')",
            name="ck_pembayaran_metode",
        ),
        sa.CheckConstraint(
            "penyedia_gateway IN ('midtrans','xendit','manual')",
            name="ck_pembayaran_penyedia_gateway",
        ),
        sa.CheckConstraint(
            "status IN ('menunggu','diproses','berhasil','gagal','kedaluwarsa',"
            "'refund_sebagian','refund_penuh')",
            name="ck_pembayaran_status",
        ),
    )

    # --- webhook_pembayaran ---
    op.create_table(
        "webhook_pembayaran",
        _uid_col(),
        sa.Column("penyedia_gateway", sa.String, nullable=False),
        sa.Column("event_id", sa.String, nullable=False, unique=True),
        sa.Column("ref_eksternal", sa.String, nullable=False),
        sa.Column("jenis_event", sa.String, nullable=False),
        sa.Column("muatan", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status_proses", sa.String, nullable=False, server_default="diterima"),
        sa.Column("diterima_pada", TS, server_default=sa.text("now()"), nullable=False),
        sa.Column("diproses_pada", TS),
        sa.CheckConstraint(
            "status_proses IN ('diterima','diproses','diabaikan','gagal')",
            name="ck_webhook_status_proses",
        ),
    )

    # --- rekening_penyedia ---
    op.create_table(
        "rekening_penyedia",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("penyedia_tipe", sa.String, nullable=False),
        sa.Column("penyedia_id", UUID(as_uuid=True), nullable=False),
        sa.Column("jenis", sa.String, nullable=False),
        sa.Column("bank_kode", sa.String),
        sa.Column("nomor", sa.String, nullable=False),
        sa.Column("nama_pemilik", sa.String, nullable=False),
        sa.Column("terverifikasi", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("utama", sa.Boolean, nullable=False, server_default=sa.text("true")),
        _dibuat(),
        sa.CheckConstraint(
            "jenis IN ('bank','ewallet')",
            name="ck_rekening_jenis",
        ),
    )

    # --- payout ---
    op.create_table(
        "payout",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("penyedia_tipe", sa.String, nullable=False),
        sa.Column("penyedia_id", UUID(as_uuid=True), nullable=False),
        sa.Column("rekening_id", UUID(as_uuid=True), sa.ForeignKey("rekening_penyedia.id"), nullable=False),
        sa.Column("jumlah", sa.Numeric, nullable=False),
        sa.Column("metode", sa.String, nullable=False),
        sa.Column("status", sa.String, nullable=False, server_default="antri"),
        sa.Column("ref_eksternal", sa.String),
        sa.Column("catatan", sa.Text),
        _dibuat(),
        sa.Column("diproses_pada", TS),
        sa.CheckConstraint(
            "metode IN ('disbursement','manual')",
            name="ck_payout_metode",
        ),
        sa.CheckConstraint(
            "status IN ('antri','diproses','berhasil','gagal')",
            name="ck_payout_status",
        ),
    )
    op.create_index("ix_payout_desa_status", "payout", ["desa_id", "status"])
    op.create_index("ix_payout_penyedia", "payout", ["penyedia_tipe", "penyedia_id"])

    # --- transaksi ---
    op.create_table(
        "transaksi",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pesanan_id", UUID(as_uuid=True), sa.ForeignKey("pesanan.id"), nullable=False),
        sa.Column("pembayaran_id", UUID(as_uuid=True), sa.ForeignKey("pembayaran.id")),
        sa.Column("penyedia_tipe", sa.String, nullable=False),
        sa.Column("penyedia_id", UUID(as_uuid=True), nullable=False),
        sa.Column("jenis", sa.String, nullable=False),
        sa.Column("bruto", sa.Numeric, nullable=False),
        sa.Column("fee_platform", sa.Numeric, nullable=False),
        sa.Column("porsi_reinvestasi", sa.Numeric, nullable=False),
        sa.Column("neto_penyedia", sa.Numeric, nullable=False),
        sa.Column("status", sa.String, nullable=False),
        sa.Column("payout_id", UUID(as_uuid=True), sa.ForeignKey("payout.id")),
        _dibuat(),
        sa.CheckConstraint(
            "bruto = fee_platform + porsi_reinvestasi + neto_penyedia",
            name="ck_transaksi_split",
        ),
        sa.CheckConstraint(
            "jenis IN ('penjualan','refund','penyesuaian')",
            name="ck_transaksi_jenis",
        ),
        sa.CheckConstraint(
            "status IN ('tertahan_escrow','dirilis','direfund','sebagian_refund')",
            name="ck_transaksi_status",
        ),
    )
    op.create_index("ix_transaksi_desa_dibuat", "transaksi", ["desa_id", "dibuat_pada"])
    op.create_index("ix_transaksi_penyedia_status", "transaksi", ["penyedia_tipe", "penyedia_id", "status"])
    op.create_index("ix_transaksi_pesanan", "transaksi", ["pesanan_id"])

    # --- refund ---
    op.create_table(
        "refund",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pesanan_id", UUID(as_uuid=True), sa.ForeignKey("pesanan.id"), nullable=False),
        sa.Column("pesanan_item_id", UUID(as_uuid=True), sa.ForeignKey("pesanan_item.id")),
        sa.Column("pemohon_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("alasan", sa.Text, nullable=False),
        sa.Column("jumlah", sa.Numeric, nullable=False),
        sa.Column("status", sa.String, nullable=False, server_default="diajukan"),
        sa.Column("ref_eksternal", sa.String),
        sa.Column("disetujui_oleh", UUID(as_uuid=True), sa.ForeignKey("pengguna.id")),
        _dibuat(),
        sa.Column("selesai_pada", TS),
        sa.CheckConstraint(
            "status IN ('diajukan','disetujui','ditolak','diproses','selesai')",
            name="ck_refund_status",
        ),
    )

    # --- penukaran_poin ---
    op.create_table(
        "penukaran_poin",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("hadiah_id", UUID(as_uuid=True), sa.ForeignKey("katalog_hadiah.id"), nullable=False),
        sa.Column("poin_dipakai", sa.Integer, nullable=False),
        sa.Column("kupon_id", UUID(as_uuid=True), sa.ForeignKey("kupon.id")),
        sa.Column("status", sa.String, nullable=False, server_default="berhasil"),
        _dibuat(),
        sa.CheckConstraint(
            "status IN ('berhasil','dibatalkan')",
            name="ck_penukaran_poin_status",
        ),
    )
    op.create_index("ix_penukaran_desa_pengguna", "penukaran_poin", ["desa_id", "pengguna_id"])

    # --- pemakaian_kupon ---
    op.create_table(
        "pemakaian_kupon",
        _uid_col(),
        sa.Column("kupon_id", UUID(as_uuid=True), sa.ForeignKey("kupon.id"), nullable=False),
        sa.Column("pesanan_id", UUID(as_uuid=True), sa.ForeignKey("pesanan.id"), nullable=False),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("jumlah_diskon", sa.Numeric, nullable=False),
        _dibuat(),
        sa.UniqueConstraint("kupon_id", "pesanan_id", name="uq_pemakaian_kupon_pesanan"),
    )

    # --- stasiun_lestari ---
    op.create_table(
        "stasiun_lestari",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("tipe", sa.String, nullable=False),
        sa.Column("destinasi_id", UUID(as_uuid=True), sa.ForeignKey("destinasi.id")),
        sa.Column("lokasi", Geography(geometry_type="POINT", srid=4326, spatial_index=False)),
        sa.Column("qr_token", sa.String, nullable=False, unique=True),
        sa.Column("radius_m", sa.Integer, nullable=False, server_default="50"),
        sa.Column("aktif", sa.Boolean, nullable=False, server_default=sa.text("true")),
        _dibuat(),
        sa.CheckConstraint(
            "tipe IN ('dermaga','titik_mangrove','pos')",
            name="ck_stasiun_tipe",
        ),
    )
    op.create_index("ix_stasiun_lestari_lokasi_gist", "stasiun_lestari", ["lokasi"], postgresql_using="gist")

    # --- misi ---
    op.create_table(
        "misi",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id")),
        sa.Column("kode", sa.String, nullable=False, unique=True),
        sa.Column("judul", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text),
        sa.Column("jenis", sa.String, nullable=False),
        sa.Column("kategori", sa.String, nullable=False),
        sa.Column("micro_lesson", JSONB),
        sa.Column("syarat_verifikasi", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("stasiun_id", UUID(as_uuid=True), sa.ForeignKey("stasiun_lestari.id")),
        sa.Column("poin", sa.Integer, nullable=False, server_default="0"),
        sa.Column("badge_id", sa.SmallInteger, sa.ForeignKey("badge.id")),
        sa.Column("dampak_template", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("aktif", sa.Boolean, nullable=False, server_default=sa.text("true")),
        _dibuat(),
        sa.CheckConstraint(
            "jenis IN ('belajar','aksi')",
            name="ck_misi_jenis",
        ),
        sa.CheckConstraint(
            "kategori IN ('mangrove','karang','sampah','lumba','budaya')",
            name="ck_misi_kategori",
        ),
    )

    # --- paspor_lestari ---
    op.create_table(
        "paspor_lestari",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("ringkasan_dampak", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("total_stempel", sa.Integer, nullable=False, server_default="0"),
        _dibuat(),
        _diperbarui(),
        sa.UniqueConstraint("desa_id", "pengguna_id", name="uq_paspor_desa_pengguna"),
    )

    # --- stempel ---
    op.create_table(
        "stempel",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("paspor_id", UUID(as_uuid=True), sa.ForeignKey("paspor_lestari.id"), nullable=False),
        sa.Column("misi_id", UUID(as_uuid=True), sa.ForeignKey("misi.id"), nullable=False),
        sa.Column("booking_id", UUID(as_uuid=True), sa.ForeignKey("booking.id")),
        sa.Column("stasiun_id", UUID(as_uuid=True), sa.ForeignKey("stasiun_lestari.id")),
        sa.Column("dampak", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String, nullable=False, server_default="menunggu_verifikasi"),
        sa.Column("lokasi", Geography(geometry_type="POINT", srid=4326, spatial_index=False)),
        sa.Column("media_id", UUID(as_uuid=True), sa.ForeignKey("media.id")),
        _dibuat(),
        sa.CheckConstraint(
            "status IN ('menunggu_verifikasi','terverifikasi','ditolak')",
            name="ck_stempel_status",
        ),
    )

    # --- verifikasi ---
    op.create_table(
        "verifikasi",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("entitas_tipe", sa.String, nullable=False),
        sa.Column("entitas_id", UUID(as_uuid=True), nullable=False),
        sa.Column("metode", sa.String, nullable=False),
        sa.Column("verifikator_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id")),
        sa.Column("syarat", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("hasil", sa.String, nullable=False, server_default="menunggu"),
        sa.Column("bukti", JSONB),
        sa.Column("lokasi", Geography(geometry_type="POINT", srid=4326, spatial_index=False)),
        _dibuat(),
        sa.Column("diputuskan_pada", TS),
        sa.CheckConstraint(
            "entitas_tipe IN ('stempel','pengajuan_kartu')",
            name="ck_verifikasi_entitas_tipe",
        ),
        sa.CheckConstraint(
            "metode IN ('qr_checkin','foto_geotag','konfirmasi_pemandu','otomatis')",
            name="ck_verifikasi_metode",
        ),
        sa.CheckConstraint(
            "hasil IN ('menunggu','valid','invalid')",
            name="ck_verifikasi_hasil",
        ),
    )
    op.create_index("ix_verifikasi_entitas", "verifikasi", ["entitas_tipe", "entitas_id"])
    op.create_index("ix_verifikasi_desa_hasil", "verifikasi", ["desa_id", "hasil"])

    # --- sesi_pemandu ---
    op.create_table(
        "sesi_pemandu",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("pengguna_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id")),
        sa.Column("tipe", sa.String, nullable=False),
        sa.Column("masukan", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("keluaran", JSONB),
        sa.Column("model_dipakai", sa.String, nullable=False, server_default="rule"),
        _dibuat(),
        sa.CheckConstraint(
            "tipe IN ('itinerary','estimasi','chat')",
            name="ck_sesi_pemandu_tipe",
        ),
        sa.CheckConstraint(
            "model_dipakai IN ('rule','llm')",
            name="ck_sesi_pemandu_model",
        ),
    )

    # --- percakapan_pemandu ---
    op.create_table(
        "percakapan_pemandu",
        _uid_col(),
        sa.Column("sesi_id", UUID(as_uuid=True), sa.ForeignKey("sesi_pemandu.id", ondelete="CASCADE"), nullable=False),
        sa.Column("peran", sa.String, nullable=False),
        sa.Column("isi", sa.Text, nullable=False),
        sa.Column("sumber", JSONB),
        _dibuat(),
    )

    _seed()


def _seed() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "INSERT INTO pengaturan_desa "
            "(desa_id, gateway, persen_reinvestasi, persen_fee_platform, "
            "batas_hold_menit, kebijakan_pembatalan) "
            "SELECT id, :gateway, :reinvestasi, :fee, :hold, :kebijakan "
            "FROM desa WHERE slug = :slug"
        ),
        {
            "slug": "teluk-kiluan",
            "gateway": "manual",
            "reinvestasi": "0.10",
            "fee": "0.02",
            "hold": 30,
            "kebijakan": json.dumps({"catatan": "belum_disahkan_fgd"}),
        },
    )


def downgrade() -> None:
    for t in (
        "percakapan_pemandu",
        "sesi_pemandu",
        "verifikasi",
        "stempel",
        "paspor_lestari",
        "misi",
        "stasiun_lestari",
        "pemakaian_kupon",
        "penukaran_poin",
        "refund",
        "transaksi",
        "payout",
        "rekening_penyedia",
        "webhook_pembayaran",
        "pembayaran",
        "booking",
        "pesanan_item",
        "slot_jadwal",
        "pesanan",
        "kupon",
        "katalog_hadiah",
        "pengaturan_desa",
    ):
        op.drop_table(t)
