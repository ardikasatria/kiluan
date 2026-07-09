"""Rakit repo + service + seed untuk uji F1."""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from . import seed
from .layanan.dapur_konten import KontribusiService
from .layanan.lencana_warga import BadgeService, PoinService
from .layanan.naik_kelas import PengajuanKartuService, SertifikasiService
from .layanan.pasar_desa import PaketService, ProdukService, UmkmService
from .repositori import RepoMemori


@dataclass
class Aplikasi:
    repo_umkm: RepoMemori
    repo_produk: RepoMemori
    repo_paket: RepoMemori
    repo_paket_item: RepoMemori
    repo_kontribusi: RepoMemori
    repo_kurasi_log: RepoMemori
    repo_aturan_poin: RepoMemori
    repo_transaksi_poin: RepoMemori
    repo_badge: RepoMemori
    repo_badge_pengguna: RepoMemori
    repo_kartu: RepoMemori
    repo_pengajuan: RepoMemori
    repo_sertifikasi: RepoMemori
    repo_bidang: RepoMemori
    repo_destinasi: RepoMemori
    repo_layanan: RepoMemori
    umkm: UmkmService
    produk: ProdukService
    paket: PaketService
    kontribusi: KontribusiService
    poin: PoinService
    badge: BadgeService
    sertifikasi: SertifikasiService
    pengajuan_kartu: PengajuanKartuService


async def bangun_aplikasi() -> Aplikasi:
    repo_umkm = RepoMemori()
    repo_produk = RepoMemori()
    repo_paket = RepoMemori()
    repo_paket_item = RepoMemori()
    repo_kontribusi = RepoMemori()
    repo_kurasi_log = RepoMemori()
    repo_aturan_poin = RepoMemori(id_int=True)
    repo_transaksi_poin = RepoMemori()
    repo_badge = RepoMemori(id_int=True)
    repo_badge_pengguna = RepoMemori()
    repo_kartu = RepoMemori(id_int=True)
    repo_pengajuan = RepoMemori()
    repo_sertifikasi = RepoMemori()
    repo_bidang = RepoMemori(id_int=True)
    repo_destinasi = RepoMemori()
    repo_layanan = RepoMemori()

    await seed.isi_semua(repo_bidang, repo_aturan_poin, repo_badge, repo_kartu)

    poin = PoinService(repo_transaksi_poin, repo_aturan_poin)
    badge = BadgeService(repo_badge, repo_badge_pengguna, poin)
    poin.badge_service = badge

    umkm = UmkmService(repo_umkm, repo_sertifikasi)
    produk = ProdukService(repo_produk, umkm, poin)
    paket = PaketService(repo_paket, repo_paket_item, repo_kurasi_log, poin)
    kontribusi = KontribusiService(repo_kontribusi, repo_kurasi_log, poin)
    sertifikasi = SertifikasiService(repo_sertifikasi, repo_pengajuan, repo_kartu)
    pengajuan_kartu = PengajuanKartuService(
        repo_pengajuan, repo_kartu, repo_kurasi_log, sertifikasi, repo_umkm,
    )

    return Aplikasi(
        repo_umkm=repo_umkm,
        repo_produk=repo_produk,
        repo_paket=repo_paket,
        repo_paket_item=repo_paket_item,
        repo_kontribusi=repo_kontribusi,
        repo_kurasi_log=repo_kurasi_log,
        repo_aturan_poin=repo_aturan_poin,
        repo_transaksi_poin=repo_transaksi_poin,
        repo_badge=repo_badge,
        repo_badge_pengguna=repo_badge_pengguna,
        repo_kartu=repo_kartu,
        repo_pengajuan=repo_pengajuan,
        repo_sertifikasi=repo_sertifikasi,
        repo_bidang=repo_bidang,
        repo_destinasi=repo_destinasi,
        repo_layanan=repo_layanan,
        umkm=umkm,
        produk=produk,
        paket=paket,
        kontribusi=kontribusi,
        poin=poin,
        badge=badge,
        sertifikasi=sertifikasi,
        pengajuan_kartu=pengajuan_kartu,
    )
