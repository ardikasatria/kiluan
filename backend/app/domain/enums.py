"""Enum domain Fase 0 — nilai persis mengikuti ERD_Kiluan_Fase0.md.

Enum ditegakkan di level aplikasi (bukan ENUM native Postgres) agar mudah
menambah nilai tanpa migrasi berat; di DB dijaga lewat CHECK/lookup.
"""
from enum import Enum


class StatusDesa(str, Enum):
    draft = "draft"
    aktif = "aktif"
    nonaktif = "nonaktif"


class StatusPengguna(str, Enum):
    pending = "pending"
    aktif = "aktif"
    nonaktif = "nonaktif"
    tersuspensi = "tersuspensi"


class KodePeran(str, Enum):
    wisatawan = "wisatawan"
    umkm = "umkm"
    agen = "agen"
    kontributor = "kontributor"
    organisasi = "organisasi"
    perangkat_desa = "perangkat_desa"
    admin = "admin"


class StatusKeanggotaan(str, Enum):
    aktif = "aktif"
    menunggu = "menunggu"
    ditolak = "ditolak"
    revisi = "revisi"
    nonaktif = "nonaktif"


class TipeToken(str, Enum):
    penyegar = "penyegar"
    verifikasi_email = "verifikasi_email"
    reset_sandi = "reset_sandi"


class StatusKonten(str, Enum):
    """Dipakai destinasi & layanan (draft | publikasi | arsip)."""
    draft = "draft"
    publikasi = "publikasi"
    arsip = "arsip"


class JenisLayanan(str, Enum):
    transportasi = "transportasi"
    pemandu = "pemandu"
    penginapan = "penginapan"
    sewa_alat = "sewa_alat"
    kuliner = "kuliner"
    tiket_masuk = "tiket_masuk"
    lainnya = "lainnya"


class SatuanHarga(str, Enum):
    per_orang = "per_orang"
    per_paket = "per_paket"
    per_malam = "per_malam"
    per_unit = "per_unit"
    per_jam = "per_jam"


class StatusVerifikasiUmkm(str, Enum):
    menunggu = "menunggu"
    terverifikasi = "terverifikasi"
    ditolak = "ditolak"


class JenisProduk(str, Enum):
    produk = "produk"
    jasa = "jasa"


class StatusProduk(str, Enum):
    draft = "draft"
    publikasi = "publikasi"
    arsip = "arsip"


class StatusPaket(str, Enum):
    draft = "draft"
    review = "review"
    publikasi = "publikasi"
    ditolak = "ditolak"
    arsip = "arsip"


class TipeKontribusi(str, Enum):
    foto = "foto"
    tips = "tips"
    koreksi_data = "koreksi_data"
    spot_baru = "spot_baru"
    ulasan = "ulasan"


class TargetKontribusi(str, Enum):
    destinasi = "destinasi"
    layanan = "layanan"
    umkm = "umkm"
    paket_wisata = "paket_wisata"
    desa = "desa"


class StatusKontribusi(str, Enum):
    menunggu = "menunggu"
    disetujui = "disetujui"
    ditolak = "ditolak"
    revisi = "revisi"


class TipeKalender(str, Enum):
    harian = "harian"
    musiman = "musiman"
    event = "event"


class StatusKalender(str, Enum):
    aktif = "aktif"
    nonaktif = "nonaktif"


class TipeMedia(str, Enum):
    foto = "foto"
    video = "video"


class EntitasLampiran(str, Enum):
    destinasi = "destinasi"
    layanan = "layanan"
    desa = "desa"
    pengguna = "pengguna"
    umkm = "umkm"
    produk_jasa = "produk_jasa"
    paket_wisata = "paket_wisata"
    kontribusi = "kontribusi"
    berita = "berita"


class KategoriBerita(str, Enum):
    pengumuman = "pengumuman"
    cerita = "cerita"
    konservasi = "konservasi"
    acara = "acara"
    panduan = "panduan"
    lainnya = "lainnya"


class StatusBerita(str, Enum):
    draft = "draft"
    publikasi = "publikasi"
    arsip = "arsip"


class StatusNotifikasi(str, Enum):
    belum_dibaca = "belum_dibaca"
    dibaca = "dibaca"


class KanalNotifikasi(str, Enum):
    in_app = "in_app"
    email = "email"


class SubjekPengajuan(str, Enum):
    umkm = "umkm"
    agen = "agen"
    kontributor = "kontributor"


def normalisasi_kode_peran(kode: str) -> KodePeran:
    """Slot DB lama peran_id=2 (pokdarwis) → kontributor."""
    if kode == "pokdarwis":
        return KodePeran.kontributor
    return KodePeran(kode)


class StatusPengajuanKartu(str, Enum):
    menunggu = "menunggu"
    tervalidasi = "tervalidasi"
    ditolak = "ditolak"
    revisi = "revisi"


class TingkatSertifikasi(str, Enum):
    tunas = "tunas"
    bahari = "bahari"
    lumba_lumba = "lumba_lumba"
