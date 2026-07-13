"""0011 — Fase 3 Jejak Lestari + Anjungan Data (seluruh tabel F3).

Revision ID: 0011_f3
Revises: 0010_bersih_pokdarwis_fase3
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID

revision = "0011_f3"
down_revision = "0010_bersih_pokdarwis_fase3"
branch_labels = None
depends_on = None

TS = TIMESTAMP(timezone=True)

JENIS_PERISTIWA_F3 = (
    "booking_selesai",
    "transaksi_settle",
    "monitoring_terverifikasi",
    "kartu_tervalidasi",
    "kontribusi_disetujui",
)

JENIS_PERISTIWA_GENTA = (
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

INDIKATOR_TEMPLATE = (
    ("kesehatan_karang", "Kesehatan Karang", "%", "naik"),
    ("populasi_lumba", "Populasi Lumba-lumba", "individu", "naik"),
    ("tutupan_mangrove", "Tutupan Mangrove", "%", "naik"),
    ("mangrove_survival", "Sintasan Mangrove", "%", "naik"),
    ("sampah_terkumpul", "Sampah Terkumpul", "kg", "turun"),
)


def _uid_col():
    return sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _dibuat():
    return sa.Column("dibuat_pada", TS, server_default=sa.text("now()"), nullable=False)


def _peristiwa_jenis_check():
    semua = JENIS_PERISTIWA_GENTA + JENIS_PERISTIWA_F3
    return "jenis IN (" + ",".join(f"'{j}'" for j in semua) + ")"


def upgrade() -> None:
    # --- indikator_ekologi ---
    op.create_table(
        "indikator_ekologi",
        sa.Column("id", sa.SmallInteger, primary_key=True, autoincrement=True),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id")),
        sa.Column("kode", sa.String, nullable=False),
        sa.Column("nama", sa.String, nullable=False),
        sa.Column("satuan", sa.String, nullable=False),
        sa.Column("arah_baik", sa.String, nullable=False),
        sa.Column("deskripsi", sa.Text, server_default=""),
        sa.Column("aktif", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.CheckConstraint("arah_baik IN ('naik','turun')", name="ck_indikator_arah_baik"),
        sa.UniqueConstraint("desa_id", "kode", name="uq_indikator_desa_kode"),
    )
    op.create_index("ix_indikator_desa_aktif", "indikator_ekologi", ["desa_id", "aktif"])

    # --- monitoring_ekologi ---
    op.create_table(
        "monitoring_ekologi",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("indikator_id", sa.SmallInteger, sa.ForeignKey("indikator_ekologi.id"), nullable=False),
        sa.Column("destinasi_id", UUID(as_uuid=True), sa.ForeignKey("destinasi.id")),
        sa.Column("nilai", sa.Numeric, nullable=False),
        sa.Column("waktu_ukur", sa.Date, nullable=False),
        sa.Column("pencatat_id", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        sa.Column("metode", sa.String, nullable=False),
        sa.Column("media_id", UUID(as_uuid=True), sa.ForeignKey("media.id")),
        sa.Column("status", sa.String, nullable=False, server_default="menunggu_verifikasi"),
        sa.Column("catatan", sa.Text, server_default=""),
        sa.Column("lokasi", Geography(geometry_type="POINT", srid=4326, spatial_index=False)),
        _dibuat(),
        sa.CheckConstraint(
            "metode IN ('survei_lapangan','sensor','laporan_warga','pihak_ketiga')",
            name="ck_monitoring_metode",
        ),
        sa.CheckConstraint(
            "status IN ('menunggu_verifikasi','terverifikasi','ditolak')",
            name="ck_monitoring_status",
        ),
    )
    op.create_index(
        "ix_monitoring_desa_indikator_waktu",
        "monitoring_ekologi",
        ["desa_id", "indikator_id", "waktu_ukur"],
    )
    op.create_index("ix_monitoring_destinasi", "monitoring_ekologi", ["destinasi_id"])

    # --- daya_dukung ---
    op.create_table(
        "daya_dukung",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("destinasi_id", UUID(as_uuid=True), sa.ForeignKey("destinasi.id"), nullable=False),
        sa.Column("kapasitas_harian", sa.Integer, nullable=False),
        sa.Column("ambang_kuning", sa.Numeric, nullable=False),
        sa.Column("ambang_merah", sa.Numeric, nullable=False),
        sa.Column("metode_hitung", sa.String, nullable=False, server_default="booking+checkin"),
        sa.Column("diperbarui_pada", TS, server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("destinasi_id", name="uq_daya_dukung_destinasi"),
    )

    # --- pemakaian_kapasitas ---
    op.create_table(
        "pemakaian_kapasitas",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("destinasi_id", UUID(as_uuid=True), sa.ForeignKey("destinasi.id"), nullable=False),
        sa.Column("tanggal", sa.Date, nullable=False),
        sa.Column("kunjungan", sa.Integer, nullable=False),
        sa.Column("kapasitas_harian", sa.Integer, nullable=False),
        sa.Column("rasio", sa.Numeric, nullable=False),
        sa.Column("level", sa.String, nullable=False),
        sa.Column("dihitung_pada", TS, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("level IN ('hijau','kuning','merah')", name="ck_pemakaian_level"),
        sa.UniqueConstraint("destinasi_id", "tanggal", name="uq_pemakaian_destinasi_tanggal"),
    )

    # --- dana_konservasi ---
    op.create_table(
        "dana_konservasi",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("jenis", sa.String, nullable=False),
        sa.Column("sumber_tipe", sa.String),
        sa.Column("sumber_id", UUID(as_uuid=True)),
        sa.Column("kategori", sa.String),
        sa.Column("jumlah", sa.Numeric, nullable=False),
        sa.Column("keterangan", sa.Text, server_default=""),
        sa.Column("bukti_media_id", UUID(as_uuid=True), sa.ForeignKey("media.id")),
        sa.Column("tanggal", sa.Date, nullable=False),
        sa.Column("dicatat_oleh", UUID(as_uuid=True), sa.ForeignKey("pengguna.id"), nullable=False),
        _dibuat(),
        sa.CheckConstraint("jenis IN ('masuk','keluar')", name="ck_dana_jenis"),
        sa.CheckConstraint(
            "sumber_tipe IS NULL OR sumber_tipe IN ('transaksi','donasi','hibah','lainnya')",
            name="ck_dana_sumber_tipe",
        ),
        sa.CheckConstraint(
            "kategori IS NULL OR kategori IN ("
            "'rehabilitasi_karang','penanaman_mangrove','pengelolaan_sampah',"
            "'edukasi','operasional','lainnya')",
            name="ck_dana_kategori",
        ),
    )
    op.create_index("ix_dana_desa_tanggal_jenis", "dana_konservasi", ["desa_id", "tanggal", "jenis"])
    op.create_index(
        "uq_dana_sumber_transaksi",
        "dana_konservasi",
        ["sumber_tipe", "sumber_id"],
        unique=True,
        postgresql_where=sa.text("sumber_tipe = 'transaksi'"),
    )

    # --- neraca_regeneratif ---
    op.create_table(
        "neraca_regeneratif",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("periode", sa.String, nullable=False),
        sa.Column("skor_ekologi", sa.Numeric, nullable=False),
        sa.Column("skor_sosial", sa.Numeric, nullable=False),
        sa.Column("skor_ekonomi", sa.Numeric, nullable=False),
        sa.Column("skor_total", sa.Numeric, nullable=False),
        sa.Column("komponen", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("terkunci", sa.Boolean, nullable=False, server_default=sa.text("false")),
        _dibuat(),
        sa.UniqueConstraint("desa_id", "periode", name="uq_neraca_desa_periode"),
    )

    # --- job_analitik ---
    op.create_table(
        "job_analitik",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id")),
        sa.Column("lapisan", sa.String, nullable=False),
        sa.Column("nama_job", sa.String, nullable=False),
        sa.Column("status", sa.String, nullable=False),
        sa.Column("baris_masuk", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("baris_keluar", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("mulai_pada", TS, server_default=sa.text("now()"), nullable=False),
        sa.Column("selesai_pada", TS),
        sa.Column("galat", sa.Text),
        sa.CheckConstraint("lapisan IN ('bronze','silver','gold')", name="ck_job_lapisan"),
        sa.CheckConstraint("status IN ('berjalan','sukses','gagal')", name="ck_job_status"),
    )
    op.create_index("ix_job_lapisan_status", "job_analitik", ["lapisan", "status"])

    # --- agregat_harian ---
    op.create_table(
        "agregat_harian",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("tanggal", sa.Date, nullable=False),
        sa.Column("kode_metrik", sa.String, nullable=False),
        sa.Column("dimensi", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("nilai", sa.Numeric, nullable=False),
        sa.Column("diperbarui_pada", TS, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "kode_metrik IN ("
            "'kunjungan','pendapatan','booking_selesai','transaksi_langsung',"
            "'umkm_aktif','kontribusi','adopsi_regeneratif','booking_per_tingkat')",
            name="ck_agregat_kode_metrik",
        ),
        sa.UniqueConstraint("desa_id", "tanggal", "kode_metrik", "dimensi", name="uq_agregat_baris"),
    )

    # --- laporan_bulanan ---
    op.create_table(
        "laporan_bulanan",
        _uid_col(),
        sa.Column("desa_id", UUID(as_uuid=True), sa.ForeignKey("desa.id"), nullable=False),
        sa.Column("periode", sa.String, nullable=False),
        sa.Column("ringkasan", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("file_media_id", UUID(as_uuid=True), sa.ForeignKey("media.id")),
        sa.Column("status", sa.String, nullable=False, server_default="draf"),
        _dibuat(),
        sa.CheckConstraint("status IN ('draf','final')", name="ck_laporan_status"),
        sa.UniqueConstraint("desa_id", "periode", name="uq_laporan_desa_periode"),
    )

    # --- perluas CHECK verifikasi (F2 → F3) ---
    op.drop_constraint("ck_verifikasi_entitas_tipe", "verifikasi", type_="check")
    op.create_check_constraint(
        "ck_verifikasi_entitas_tipe",
        "verifikasi",
        "entitas_tipe IN ('stempel','pengajuan_kartu','monitoring_ekologi')",
    )
    op.drop_constraint("ck_verifikasi_metode", "verifikasi", type_="check")
    op.create_check_constraint(
        "ck_verifikasi_metode",
        "verifikasi",
        "metode IN ("
        "'qr_checkin','foto_geotag','konfirmasi_pemandu','otomatis',"
        "'survei_lapangan','sensor','laporan_warga','pihak_ketiga')",
    )

    # --- perluas CHECK peristiwa (Genta + F3 analitik) ---
    op.drop_constraint("ck_peristiwa_jenis", "peristiwa", type_="check")
    op.create_check_constraint("ck_peristiwa_jenis", "peristiwa", _peristiwa_jenis_check())

    _seed_indikator()


def _seed_indikator() -> None:
    bind = op.get_bind()
    for kode, nama, satuan, arah in INDIKATOR_TEMPLATE:
        bind.execute(
            sa.text(
                "INSERT INTO indikator_ekologi (desa_id, kode, nama, satuan, arah_baik, aktif) "
                "VALUES (NULL, :kode, :nama, :satuan, :arah, true)"
            ),
            {"kode": kode, "nama": nama, "satuan": satuan, "arah": arah},
        )


def downgrade() -> None:
    op.drop_constraint("ck_peristiwa_jenis", "peristiwa", type_="check")
    op.create_check_constraint(
        "ck_peristiwa_jenis",
        "peristiwa",
        "jenis IN (" + ",".join(f"'{j}'" for j in JENIS_PERISTIWA_GENTA) + ")",
    )

    op.drop_constraint("ck_verifikasi_metode", "verifikasi", type_="check")
    op.create_check_constraint(
        "ck_verifikasi_metode",
        "verifikasi",
        "metode IN ('qr_checkin','foto_geotag','konfirmasi_pemandu','otomatis')",
    )
    op.drop_constraint("ck_verifikasi_entitas_tipe", "verifikasi", type_="check")
    op.create_check_constraint(
        "ck_verifikasi_entitas_tipe",
        "verifikasi",
        "entitas_tipe IN ('stempel','pengajuan_kartu')",
    )

    op.drop_table("laporan_bulanan")
    op.drop_table("agregat_harian")
    op.drop_table("job_analitik")
    op.drop_table("neraca_regeneratif")
    op.execute("DROP INDEX IF EXISTS uq_dana_sumber_transaksi")
    op.drop_table("dana_konservasi")
    op.drop_table("pemakaian_kapasitas")
    op.drop_table("daya_dukung")
    op.drop_table("monitoring_ekologi")
    op.drop_table("indikator_ekologi")
