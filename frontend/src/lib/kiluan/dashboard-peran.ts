import type { PeranKode } from './peran'
import { RUTE_DASBOR_WISATAWAN, RUTE_WISATAWAN } from './rute-sigerciv'

export type ZonaDasborPengelola = 'saya' | 'kelola'

export type ZonaDasborPenyedia = 'katalog' | 'operasional'

export type ZonaDasborOrganisasi = 'lapangan' | 'program'

export type ZonaDasbor = ZonaDasborPengelola | ZonaDasborPenyedia | ZonaDasborOrganisasi

export interface DashboardNavItem {
  id: string
  label: string
  /** path relatif dasbor, mis. "" = ringkasan, "/destinasi" = sub-halaman */
  segment: string
  /** Tautan absolut — mengabaikan segment + base dasbor */
  href?: string
  segera?: boolean
  /** Zona nav — kontributor (saya/kelola) atau penyedia (katalog/operasional) */
  zona?: ZonaDasbor
}

export interface DashboardStat {
  id: string
  label: string
  value: string | number
  hint?: string
  href?: string
  segera?: boolean
  fase?: string
}

export interface DashboardWidget {
  id: string
  title: string
  description: string
  fase: string
  href?: string
  segera?: boolean
  placeholder?: boolean
  zona?: ZonaDasbor
}

export interface DashboardQuickAction {
  id: string
  label: string
  href: string
  primary?: boolean
  segera?: boolean
  zona?: ZonaDasbor
}

export interface DashboardModulLink {
  label: string
  href: string
}

export interface DashboardPeranConfig {
  kode: PeranKode
  tagline: string
  deskripsi: string
  fase: string
  nav: DashboardNavItem[]
  stats: DashboardStat[]
  aksiCepat: DashboardQuickAction[]
  modulTerkait: DashboardModulLink[]
  aktivitasContoh: string[]
  widgets: DashboardWidget[]
}

function href(desa: string, path: string) {
  return path.startsWith('/') ? `/${desa}${path}` : `/${desa}/${path}`
}

/** Penerjemah relatif namespace `dasbor.{peran}` (mis. dari next-intl). */
export type PenerjemahDasbor = (key: string) => string

export function konfigDasborPeran(
  desaSlug: string,
  translators?: Partial<Record<PeranKode, PenerjemahDasbor>>,
): Record<PeranKode, DashboardPeranConfig> {
  const d = desaSlug
  const tr = (role: PeranKode, key: string, fallback: string) => {
    const t = translators?.[role]
    return t ? t(key) : fallback
  }
  return {
    wisatawan: konfigDasborWisatawan(translators?.wisatawan),
    umkm: {
      kode: 'umkm',
      tagline: tr('umkm', 'tagline', 'Pelaku usaha lokal'),
      deskripsi: tr('umkm', 'deskripsi', 'Daftar produk & jasa, kelola pesanan, dan pantau performa di Pasar Desa.'),
      fase: 'F1–F3',
      nav: [
        { id: 'ringkasan', label: tr('umkm', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'produk', label: tr('umkm', 'nav.produk', 'Produk & jasa'), segment: '/produk', zona: 'katalog' },
        { id: 'layanan', label: tr('umkm', 'nav.layanan', 'Layanan wisata'), segment: '/layanan', zona: 'katalog' },
        { id: 'sertifikasi', label: tr('umkm', 'nav.sertifikasi', 'Naik Kelas Lestari'), segment: '/sertifikasi', href: href(d, 'naik-kelas'), zona: 'katalog' },
        { id: 'pesanan', label: tr('umkm', 'nav.pesanan', 'Pesanan'), segment: '/pesanan', href: href(d, 'kelola/pesanan'), zona: 'operasional' },
        { id: 'pendapatan', label: tr('umkm', 'nav.pendapatan', 'Pendapatan'), segment: '/pendapatan', href: href(d, 'kelola/pendapatan'), zona: 'operasional' },
        { id: 'performa', label: tr('umkm', 'nav.performa', 'Performa'), segment: '/performa', segera: true, zona: 'operasional' },
      ],
      stats: [
        { id: 'produk', label: tr('umkm', 'stats.produkLabel', 'Produk aktif'), value: 0, hint: tr('umkm', 'stats.produkHint', 'Fase 1'), href: href(d, 'saya/umkm/produk') },
        { id: 'tingkat', label: tr('umkm', 'stats.tingkatLabel', 'Tingkat lestari'), value: tr('umkm', 'stats.tingkatValue', 'Tunas'), hint: tr('umkm', 'stats.tingkatHint', 'Fase 1'), href: href(d, 'naik-kelas') },
        { id: 'pesanan', label: tr('umkm', 'stats.pesananLabel', 'Pesanan aktif'), value: 0, hint: tr('umkm', 'stats.pesananHint', 'Fase 2'), href: href(d, 'kelola/pesanan') },
        { id: 'pendapatan', label: tr('umkm', 'stats.pendapatanLabel', 'Pendapatan'), value: '—', hint: tr('umkm', 'stats.pendapatanHint', 'Escrow F2'), href: href(d, 'kelola/pendapatan') },
      ],
      aksiCepat: [
        { id: 'pasar', label: tr('umkm', 'aksi.pasar', 'Buka Pasar Desa'), href: href(d, 'pasar'), primary: true, zona: 'katalog' },
        { id: 'produk', label: tr('umkm', 'aksi.produk', 'Tambah produk'), href: href(d, 'saya/umkm/produk'), zona: 'katalog' },
        { id: 'layanan', label: tr('umkm', 'aksi.layanan', 'Tambah layanan'), href: href(d, 'saya/umkm/layanan'), zona: 'katalog' },
        { id: 'kartu', label: tr('umkm', 'aksi.kartu', 'Kartu aksi'), href: href(d, 'naik-kelas'), zona: 'katalog' },
        { id: 'pesanan', label: tr('umkm', 'aksi.pesanan', 'Kelola pesanan'), href: href(d, 'kelola/pesanan'), zona: 'operasional' },
        { id: 'pendapatan', label: tr('umkm', 'aksi.pendapatan', 'Lihat pendapatan'), href: href(d, 'kelola/pendapatan'), zona: 'operasional' },
        { id: 'promo', label: tr('umkm', 'aksi.promo', 'Buat promo'), href: href(d, 'saya/kupon-promo'), zona: 'katalog' },
      ],
      modulTerkait: [
        { label: tr('umkm', 'modul.pasar', 'Pasar Desa'), href: href(d, 'pasar') },
        { label: tr('umkm', 'modul.dermaga', 'Dermaga (booking)'), href: href(d, 'paket') },
        { label: tr('umkm', 'modul.performa', 'Performa UMKM'), href: href(d, 'lestari/neraca') },
        { label: tr('umkm', 'modul.promo', 'Kupon promo'), href: href(d, 'saya/kupon-promo') },
      ],
      aktivitasContoh: [
        tr('umkm', 'aktivitas.a1', 'Mengajukan kartu aksi “tanpa plastik sekali pakai”'),
        tr('umkm', 'aktivitas.a2', 'Memperbarui harga paket snorkeling'),
      ],
      widgets: [
        {
          id: 'produk',
          title: tr('umkm', 'widgets.produkTitle', 'Produk & jasa'),
          description: tr('umkm', 'widgets.produkDesc', 'Katalog Pasar Desa milik UMKM Anda.'),
          fase: '1',
          href: href(d, 'saya/umkm/produk'),
          zona: 'katalog',
        },
        {
          id: 'layanan',
          title: tr('umkm', 'widgets.layananTitle', 'Layanan wisata'),
          description: tr('umkm', 'widgets.layananDesc', 'Transportasi, pemandu, sewa alat — milik UMKM Anda di etalase desa.'),
          fase: '0',
          href: href(d, 'saya/umkm/layanan'),
          zona: 'katalog',
        },
        {
          id: 'naik-kelas',
          title: tr('umkm', 'widgets.naikKelasTitle', 'Naik Kelas Lestari'),
          description: tr('umkm', 'widgets.naikKelasDesc', 'Kartu aksi dan progres tingkat Tunas → Lumba-Lumba.'),
          fase: '1',
          href: href(d, 'naik-kelas'),
          zona: 'katalog',
        },
        {
          id: 'verifikasi',
          title: tr('umkm', 'widgets.verifikasiTitle', 'Status verifikasi'),
          description: tr('umkm', 'widgets.verifikasiDesc', 'Profil UMKM dan legitimasi penyedia lokal.'),
          fase: '0',
          href: href(d, 'pasar'),
          zona: 'katalog',
        },
        {
          id: 'pesanan',
          title: tr('umkm', 'widgets.pesananTitle', 'Pesanan masuk'),
          description: tr('umkm', 'widgets.pesananDesc', 'Booking manual thin-F2 dari wisatawan.'),
          fase: '2',
          href: href(d, 'kelola/pesanan'),
          zona: 'operasional',
        },
        {
          id: 'pendapatan',
          title: tr('umkm', 'widgets.pendapatanTitle', 'Pendapatan & escrow'),
          description: tr('umkm', 'widgets.pendapatanDesc', 'Transaksi, fee platform, dan pencairan neto penyedia.'),
          fase: '2',
          href: href(d, 'kelola/pendapatan'),
          zona: 'operasional',
        },
        {
          id: 'performa',
          title: tr('umkm', 'widgets.performaTitle', 'Performa ringkas'),
          description: tr('umkm', 'widgets.performaDesc', 'Metrik penjualan dan dampak lestari.'),
          fase: '3',
          placeholder: true,
          zona: 'operasional',
        },
      ],
    },
    agen: {
      kode: 'agen',
      tagline: tr('agen', 'tagline', 'Penyusun paket wisata'),
      deskripsi: tr('agen', 'deskripsi', 'Buat itinerary, atur kuota & jadwal, publikasikan paket melalui alur kurasi Organisasi.'),
      fase: 'F1–F2',
      nav: [
        { id: 'ringkasan', label: tr('agen', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'paket', label: tr('agen', 'nav.paket', 'Paket saya'), segment: '/paket', zona: 'katalog' },
        { id: 'layanan', label: tr('agen', 'nav.layanan', 'Layanan wisata'), segment: '/layanan', zona: 'katalog' },
        { id: 'sertifikasi', label: tr('agen', 'nav.sertifikasi', 'Naik Kelas Lestari'), segment: '/sertifikasi', href: href(d, 'naik-kelas'), zona: 'katalog' },
        { id: 'jadwal', label: tr('agen', 'nav.jadwal', 'Kuota & jadwal'), segment: '/jadwal', href: href(d, 'kelola/slot'), zona: 'operasional' },
        { id: 'booking', label: tr('agen', 'nav.booking', 'Check-in'), segment: '/booking', href: href(d, 'kelola/checkin'), zona: 'operasional' },
        { id: 'pesanan', label: tr('agen', 'nav.pesanan', 'Pesanan'), segment: '/pesanan', href: href(d, 'kelola/pesanan'), zona: 'operasional' },
        { id: 'pendapatan', label: tr('agen', 'nav.pendapatan', 'Pendapatan'), segment: '/pendapatan', href: href(d, 'kelola/pendapatan'), zona: 'operasional' },
      ],
      stats: [
        { id: 'paket', label: tr('agen', 'stats.paketLabel', 'Paket publik'), value: 0, href: href(d, 'saya/paket') },
        { id: 'draft', label: tr('agen', 'stats.draftLabel', 'Dalam review'), value: 0, href: href(d, 'saya/paket') },
        { id: 'pesanan', label: tr('agen', 'stats.pesananLabel', 'Pesanan aktif'), value: 0, hint: tr('agen', 'stats.pesananHint', 'Fase 2'), href: href(d, 'kelola/pesanan') },
        { id: 'pendapatan', label: tr('agen', 'stats.pendapatanLabel', 'Pendapatan'), value: '—', hint: tr('agen', 'stats.pendapatanHint', 'Escrow F2'), href: href(d, 'kelola/pendapatan') },
      ],
      aksiCepat: [
        { id: 'buat', label: tr('agen', 'aksi.buat', 'Buat paket baru'), href: href(d, 'saya/paket'), primary: true, zona: 'katalog' },
        { id: 'layanan', label: tr('agen', 'aksi.layanan', 'Tambah layanan'), href: href(d, 'saya/agen/layanan'), zona: 'katalog' },
        { id: 'naik', label: tr('agen', 'aksi.naik', 'Naik kelas'), href: href(d, 'naik-kelas'), zona: 'katalog' },
        { id: 'jadwal', label: tr('agen', 'aksi.jadwal', 'Atur slot'), href: href(d, 'kelola/slot'), zona: 'operasional' },
        { id: 'checkin', label: tr('agen', 'aksi.checkin', 'Check-in tamu'), href: href(d, 'kelola/checkin'), zona: 'operasional' },
        { id: 'pesanan', label: tr('agen', 'aksi.pesanan', 'Kelola pesanan'), href: href(d, 'kelola/pesanan'), zona: 'operasional' },
        { id: 'pendapatan', label: tr('agen', 'aksi.pendapatan', 'Lihat pendapatan'), href: href(d, 'kelola/pendapatan'), zona: 'operasional' },
      ],
      modulTerkait: [
        { label: tr('agen', 'modul.paket', 'Paket wisata'), href: href(d, 'paket') },
        { label: tr('agen', 'modul.dapur', 'Dapur Konten'), href: href(d, 'kontribusi') },
        { label: tr('agen', 'modul.dermaga', 'Dermaga'), href: href(d, 'paket') },
      ],
      aktivitasContoh: [
        tr('agen', 'aktivitas.a1', 'Paket “Lumba Pagi + Snorkeling” menunggu kurasi'),
        tr('agen', 'aktivitas.a2', 'Kuota weekend 80% terisi'),
      ],
      widgets: [
        {
          id: 'paket',
          title: tr('agen', 'widgets.paketTitle', 'Editor paket wisata'),
          description: tr('agen', 'widgets.paketDesc', 'State machine draft → review → publikasi.'),
          fase: '1',
          href: href(d, 'saya/paket'),
          zona: 'katalog',
        },
        {
          id: 'layanan',
          title: tr('agen', 'widgets.layananTitle', 'Layanan wisata'),
          description: tr('agen', 'widgets.layananDesc', 'Transportasi, pemandu, dan layanan pendukung paket — milik akun agen Anda.'),
          fase: '0',
          href: href(d, 'saya/agen/layanan'),
          zona: 'katalog',
        },
        {
          id: 'sertifikasi',
          title: tr('agen', 'widgets.sertifikasiTitle', 'Naik Kelas Lestari'),
          description: tr('agen', 'widgets.sertifikasiDesc', 'Tingkat lestari agen lokal.'),
          fase: '1',
          href: href(d, 'naik-kelas'),
          zona: 'katalog',
        },
        {
          id: 'jadwal',
          title: tr('agen', 'widgets.jadwalTitle', 'Kuota & jadwal'),
          description: tr('agen', 'widgets.jadwalDesc', 'Atur slot dan kapasitas paket.'),
          fase: '1',
          href: href(d, 'kelola/slot'),
          zona: 'operasional',
        },
        {
          id: 'booking',
          title: tr('agen', 'widgets.bookingTitle', 'Check-in tamu'),
          description: tr('agen', 'widgets.bookingDesc', 'Validasi kode check-in dari wisatawan.'),
          fase: '2',
          href: href(d, 'kelola/checkin'),
          zona: 'operasional',
        },
        {
          id: 'pesanan',
          title: tr('agen', 'widgets.pesananTitle', 'Pesanan paket'),
          description: tr('agen', 'widgets.pesananDesc', 'Booking masuk dari wisatawan.'),
          fase: '2',
          href: href(d, 'kelola/pesanan'),
          zona: 'operasional',
        },
        {
          id: 'pendapatan',
          title: tr('agen', 'widgets.pendapatanTitle', 'Pendapatan & escrow'),
          description: tr('agen', 'widgets.pendapatanDesc', 'Transaksi, fee platform, dan pencairan neto agen.'),
          fase: '2',
          href: href(d, 'kelola/pendapatan'),
          zona: 'operasional',
        },
      ],
    },
    kontributor: {
      kode: 'kontributor',
      tagline: tr('kontributor', 'tagline', 'Kontributor & pengelola desa'),
      deskripsi: tr('kontributor', 'deskripsi', 'Sumbang foto, tips, dan koreksi data — plus kelola destinasi, kurasi konten, dan keanggotaan desa.'),
      fase: 'F0–F3',
      nav: [
        { id: 'ringkasan', label: tr('kontributor', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'kontribusi', label: tr('kontributor', 'nav.kontribusi', 'Kontribusi saya'), segment: '/kontribusi', zona: 'saya' },
        { id: 'lencana', label: tr('kontributor', 'nav.lencana', 'Lencana'), segment: '/lencana', zona: 'saya' },
        { id: 'leaderboard', label: tr('kontributor', 'nav.leaderboard', 'Leaderboard'), segment: '/leaderboard', zona: 'saya' },
        { id: 'destinasi', label: tr('kontributor', 'nav.destinasi', 'Destinasi'), segment: '/destinasi', href: href(d, 'kelola/destinasi'), zona: 'kelola' },
        { id: 'kurasi', label: tr('kontributor', 'nav.kurasi', 'Antrian kurasi'), segment: '/kurasi', href: href(d, 'kelola/kurasi'), zona: 'kelola' },
        { id: 'keanggotaan', label: tr('kontributor', 'nav.keanggotaan', 'Keanggotaan'), segment: '/keanggotaan', href: href(d, 'kelola/keanggotaan'), zona: 'kelola' },
        { id: 'kelola', label: tr('kontributor', 'nav.kelola', 'Konsol kelola'), segment: '/operasional', href: href(d, 'kelola'), zona: 'kelola' },
      ],
      stats: [
        { id: 'total', label: tr('kontributor', 'stats.totalLabel', 'Kontribusi'), value: 0, href: href(d, 'kontribusi') },
        { id: 'diterima', label: tr('kontributor', 'stats.diterimaLabel', 'Diterima'), value: 0, href: href(d, 'kontribusi') },
        { id: 'publik', label: tr('kontributor', 'stats.publikLabel', 'Destinasi publik'), value: '—', href: href(d, 'kelola/destinasi') },
        { id: 'kontrib', label: tr('kontributor', 'stats.kontribLabel', 'Antrian kurasi'), value: '—', hint: tr('kontributor', 'stats.kontribHint', 'Menunggu'), href: href(d, 'kelola/kurasi'), fase: '1' },
      ],
      aksiCepat: [
        { id: 'baru', label: tr('kontributor', 'aksi.baru', 'Kontribusi baru'), href: href(d, 'kontribusi'), primary: true, zona: 'saya' },
        { id: 'lencana', label: tr('kontributor', 'aksi.lencana', 'Lihat lencana'), href: href(d, 'saya/lencana'), zona: 'saya' },
        { id: 'board', label: tr('kontributor', 'aksi.board', 'Leaderboard'), href: href(d, 'leaderboard'), zona: 'saya' },
        { id: 'kurasi', label: tr('kontributor', 'aksi.kurasi', 'Kurasi konten'), href: href(d, 'kelola/kurasi'), zona: 'kelola' },
        { id: 'keanggotaan', label: tr('kontributor', 'aksi.keanggotaan', 'Persetujuan keanggotaan'), href: href(d, 'kelola/keanggotaan'), zona: 'kelola' },
        { id: 'kelola', label: tr('kontributor', 'aksi.konsol', 'Buka konsol kelola'), href: href(d, 'kelola'), zona: 'kelola' },
      ],
      modulTerkait: [
        { label: tr('kontributor', 'modul.kontribusi', 'Kontribusi'), href: href(d, 'kontribusi') },
        { label: tr('kontributor', 'modul.lencana', 'Lencana Warga'), href: href(d, 'lencana') },
        { label: tr('kontributor', 'modul.crud', 'Kelola desa (CRUD)'), href: href(d, 'kelola') },
        { label: tr('kontributor', 'modul.hadiah', 'Hadiah & kupon'), href: href(d, 'kelola/hadiah') },
        { label: tr('kontributor', 'modul.dermaga', 'Dermaga & escrow'), href: href(d, 'kelola/bendahara') },
      ],
      aktivitasContoh: [
        tr('kontributor', 'aktivitas.a1', 'Mengunggah foto spot Gigi Hiu — menunggu kurasi'),
        tr('kontributor', 'aktivitas.a2', 'Mendapat lencana Kontributor Aktif'),
      ],
      widgets: [
        {
          id: 'kontrib',
          title: tr('kontributor', 'widgets.kontribTitle', 'Kontribusi saya'),
          description: tr('kontributor', 'widgets.kontribDesc', 'Foto, tips, koreksi — dengan status kurasi.'),
          fase: '1',
          href: href(d, 'kontribusi'),
          zona: 'saya',
        },
        {
          id: 'poin',
          title: tr('kontributor', 'widgets.poinTitle', 'Poin & lencana'),
          description: tr('kontributor', 'widgets.poinDesc', 'Gamifikasi kontribusi komunitas.'),
          fase: '1',
          href: href(d, 'saya/lencana'),
          zona: 'saya',
        },
        {
          id: 'leaderboard',
          title: tr('kontributor', 'widgets.leaderboardTitle', 'Leaderboard'),
          description: tr('kontributor', 'widgets.leaderboardDesc', 'Peringkat kontributor aktif di desa.'),
          fase: '1',
          href: href(d, 'leaderboard'),
          zona: 'saya',
        },
        {
          id: 'destinasi',
          title: tr('kontributor', 'widgets.destinasiTitle', 'Kelola destinasi'),
          description: tr('kontributor', 'widgets.destinasiDesc', 'Spot, layanan, kalender aktivitas — modul F0 aktif.'),
          fase: '0',
          href: href(d, 'kelola/destinasi'),
          zona: 'kelola',
        },
        {
          id: 'kurasi',
          title: tr('kontributor', 'widgets.kurasiTitle', 'Dapur Konten'),
          description: tr('kontributor', 'widgets.kurasiDesc', 'Antrian kurasi kontribusi wisatawan dan paket agen.'),
          fase: '1',
          href: href(d, 'kelola/kurasi'),
          zona: 'kelola',
        },
        {
          id: 'keanggotaan',
          title: tr('kontributor', 'widgets.keanggotaanTitle', 'Persetujuan keanggotaan'),
          description: tr('kontributor', 'widgets.keanggotaanDesc', 'Aktivasi peran baru di desa.'),
          fase: '0',
          href: href(d, 'kelola/keanggotaan'),
          zona: 'kelola',
        },
        {
          id: 'naik-kelas',
          title: tr('kontributor', 'widgets.naikKelasTitle', 'Validasi Naik Kelas'),
          description: tr('kontributor', 'widgets.naikKelasDesc', 'Setujui kartu aksi dan tingkat sertifikasi UMKM.'),
          fase: '1',
          href: href(d, 'kelola/validasi-kartu'),
          zona: 'kelola',
        },
      ],
    },
    organisasi: {
      kode: 'organisasi',
      tagline: tr('organisasi', 'tagline', 'Mitra konservasi & riset'),
      deskripsi: tr(
        'organisasi',
        'deskripsi',
        'Program konservasi lintas program, data ekologi terverifikasi, dan jejak dampak lestari — bukan operasional harian desa.',
      ),
      fase: 'F1–F3',
      nav: [
        { id: 'ringkasan', label: tr('organisasi', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'monitoring', label: tr('organisasi', 'nav.monitoring', 'Monitoring'), segment: '/monitoring', href: href(d, 'lestari/monitoring'), zona: 'lapangan' },
        { id: 'ekologi', label: tr('organisasi', 'nav.ekologi', 'Catat data'), segment: '/ekologi', href: href(d, 'lestari/monitoring/catat'), zona: 'lapangan' },
        { id: 'verifikasi', label: tr('organisasi', 'nav.verifikasi', 'Verifikasi data'), segment: '/verifikasi', href: href(d, 'kelola/verifikasi-monitoring'), zona: 'lapangan' },
        { id: 'dana', label: tr('organisasi', 'nav.dana', 'Dana konservasi'), segment: '/dana', href: href(d, 'lestari/dana'), zona: 'program' },
        { id: 'neraca', label: tr('organisasi', 'nav.neraca', 'Neraca lestari'), segment: '/neraca', href: href(d, 'lestari/neraca'), zona: 'program' },
        { id: 'laporan', label: tr('organisasi', 'nav.laporan', 'Laporan desa'), segment: '/laporan', href: href(d, 'data/laporan'), zona: 'program' },
        { id: 'program', label: tr('organisasi', 'nav.program', 'Program mitra'), segment: '/program', segera: true, zona: 'program' },
      ],
      stats: [
        { id: 'monitoring', label: tr('organisasi', 'stats.monitoringLabel', 'Pembacaan'), value: 0, href: href(d, 'lestari/monitoring') },
        { id: 'indikator', label: tr('organisasi', 'stats.indikatorLabel', 'Indikator'), value: 0, hint: tr('organisasi', 'stats.indikatorHint', 'Fase 3'), href: href(d, 'lestari/monitoring') },
        { id: 'verifikasi', label: tr('organisasi', 'stats.verifikasiLabel', 'Menunggu verifikasi'), value: 0, href: href(d, 'kelola/verifikasi-monitoring') },
        { id: 'neraca', label: tr('organisasi', 'stats.neracaLabel', 'Periode neraca'), value: 0, href: href(d, 'lestari/neraca') },
        { id: 'dana', label: tr('organisasi', 'stats.danaLabel', 'Saldo dana'), value: '—', href: href(d, 'lestari/dana') },
        { id: 'laporan', label: tr('organisasi', 'stats.laporanLabel', 'Laporan'), value: 0, href: href(d, 'data/laporan') },
      ],
      aksiCepat: [
        { id: 'monitor', label: tr('organisasi', 'aksi.monitor', 'Catat monitoring'), href: href(d, 'lestari/monitoring/catat'), primary: true, zona: 'lapangan' },
        { id: 'verifikasi', label: tr('organisasi', 'aksi.verifikasi', 'Verifikasi data'), href: href(d, 'kelola/verifikasi-monitoring'), zona: 'lapangan' },
        { id: 'dana', label: tr('organisasi', 'aksi.dana', 'Dana konservasi'), href: href(d, 'lestari/dana'), zona: 'program' },
        { id: 'neraca', label: tr('organisasi', 'aksi.neraca', 'Neraca lestari'), href: href(d, 'lestari/neraca'), zona: 'program' },
        { id: 'laporan', label: tr('organisasi', 'aksi.laporan', 'Laporan bulanan'), href: href(d, 'data/laporan'), zona: 'program' },
        { id: 'data', label: tr('organisasi', 'aksi.data', 'Anjungan data'), href: href(d, 'data'), zona: 'program' },
      ],
      modulTerkait: [
        { label: tr('organisasi', 'modul.monitoring', 'Monitoring Ekologi'), href: href(d, 'lestari/monitoring') },
        { label: tr('organisasi', 'modul.jejak', 'Jejak Lestari'), href: href(d, 'lestari/neraca') },
        { label: tr('organisasi', 'modul.laporan', 'Laporan desa'), href: href(d, 'data/laporan') },
        { label: tr('organisasi', 'modul.dana', 'Dana konservasi'), href: href(d, 'lestari/dana') },
      ],
      aktivitasContoh: [
        tr('organisasi', 'aktivitas.a1', 'Mengunggah data indeks karang Q2'),
        tr('organisasi', 'aktivitas.a2', 'Menyponsori program mangrove'),
      ],
      widgets: [
        {
          id: 'monitoring',
          title: tr('organisasi', 'widgets.monitoringTitle', 'Monitoring ekologi'),
          description: tr('organisasi', 'widgets.monitoringDesc', 'Pembacaan lapangan dengan alur verifikasi pekon.'),
          fase: '3',
          href: href(d, 'lestari/monitoring'),
          zona: 'lapangan',
        },
        {
          id: 'indikator',
          title: tr('organisasi', 'widgets.indikatorTitle', 'Indikator ekologi'),
          description: tr('organisasi', 'widgets.indikatorDesc', 'Katalog indeks karang, mangrove, dan biodiversitas desa.'),
          fase: '3',
          href: href(d, 'lestari/monitoring/catat'),
          zona: 'lapangan',
        },
        {
          id: 'verifikasi',
          title: tr('organisasi', 'widgets.verifikasiTitle', 'Antrian verifikasi'),
          description: tr('organisasi', 'widgets.verifikasiDesc', 'Legitimasi data lapangan sebelum masuk neraca.'),
          fase: '3',
          href: href(d, 'kelola/verifikasi-monitoring'),
          zona: 'lapangan',
        },
        {
          id: 'neraca',
          title: tr('organisasi', 'widgets.neracaTitle', 'Neraca lestari'),
          description: tr('organisasi', 'widgets.neracaDesc', 'Skor ekologi, sosial, ekonomi per periode.'),
          fase: '3',
          href: href(d, 'lestari/neraca'),
          zona: 'program',
        },
        {
          id: 'dana',
          title: tr('organisasi', 'widgets.danaTitle', 'Dana konservasi'),
          description: tr('organisasi', 'widgets.danaDesc', 'Aliran masuk/keluar dan saldo program lestari.'),
          fase: '3',
          href: href(d, 'lestari/dana'),
          zona: 'program',
        },
        {
          id: 'laporan',
          title: tr('organisasi', 'widgets.laporanTitle', 'Laporan dampak'),
          description: tr('organisasi', 'widgets.laporanDesc', 'Ringkasan bulanan kinerja wisata & lestari.'),
          fase: '3',
          href: href(d, 'data/laporan'),
          zona: 'program',
        },
        {
          id: 'program',
          title: tr('organisasi', 'widgets.programTitle', 'Program mitra'),
          description: tr('organisasi', 'widgets.programDesc', 'Kolaborasi riset dan sponsor lintas program.'),
          fase: '3',
          segera: true,
          placeholder: true,
          zona: 'program',
        },
      ],
    },
    perangkat_desa: {
      kode: 'perangkat_desa',
      tagline: tr('perangkat_desa', 'tagline', 'Tata kelola & legitimasi'),
      deskripsi: tr(
        'perangkat_desa',
        'deskripsi',
        'Legitimasi pekon: verifikasi keanggotaan, kebijakan desa, dan transparansi dana lestari.',
      ),
      fase: 'F0–F3',
      nav: [
        { id: 'ringkasan', label: tr('perangkat_desa', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'verifikasi', label: tr('perangkat_desa', 'nav.verifikasi', 'Verifikasi keanggotaan'), segment: '/verifikasi', href: href(d, 'kelola/keanggotaan') },
        { id: 'validasi', label: tr('perangkat_desa', 'nav.validasi', 'Validasi kartu'), segment: '/validasi', href: href(d, 'kelola/validasi-kartu') },
        { id: 'transparansi', label: tr('perangkat_desa', 'nav.transparansi', 'Transparansi dana'), segment: '/transparansi', href: href(d, 'lestari/dana') },
        { id: 'data', label: tr('perangkat_desa', 'nav.data', 'Anjungan data'), segment: '/data', href: href(d, 'data') },
        { id: 'kelola', label: tr('perangkat_desa', 'nav.kelola', 'Konsol kelola'), segment: '/operasional', href: href(d, 'kelola') },
      ],
      stats: [
        { id: 'anggota', label: tr('perangkat_desa', 'stats.anggotaLabel', 'Keanggotaan pending'), value: '—', href: href(d, 'kelola/keanggotaan') },
        { id: 'kontrib', label: tr('perangkat_desa', 'stats.kurasiLabel', 'Antrian kurasi'), value: '—', href: href(d, 'kelola/kurasi') },
        { id: 'spot', label: tr('perangkat_desa', 'stats.spotLabel', 'Spot aktif'), value: '—', href: href(d, 'kelola/destinasi') },
        { id: 'dana', label: tr('perangkat_desa', 'stats.danaLabel', 'Dana konservasi'), value: '—', hint: tr('perangkat_desa', 'stats.danaHint', 'Fase 3'), href: href(d, 'lestari/dana') },
      ],
      aksiCepat: [
        { id: 'keanggotaan', label: tr('perangkat_desa', 'aksi.keanggotaan', 'Persetujuan keanggotaan'), href: href(d, 'kelola/keanggotaan'), primary: true },
        { id: 'validasi', label: tr('perangkat_desa', 'aksi.validasi', 'Validasi kartu lestari'), href: href(d, 'kelola/validasi-kartu') },
        { id: 'dana', label: tr('perangkat_desa', 'aksi.dana', 'Laporan dana'), href: href(d, 'lestari/dana') },
        { id: 'data', label: tr('perangkat_desa', 'aksi.data', 'Anjungan data'), href: href(d, 'data') },
        { id: 'kelola', label: tr('perangkat_desa', 'aksi.kelola', 'Konsol kelola'), href: href(d, 'kelola') },
      ],
      modulTerkait: [
        { label: tr('perangkat_desa', 'modul.kelola', 'Kelola desa'), href: href(d, 'kelola') },
        { label: tr('perangkat_desa', 'modul.dana', 'Dana konservasi'), href: href(d, 'lestari/dana') },
        { label: tr('perangkat_desa', 'modul.neraca', 'Neraca lestari'), href: href(d, 'lestari/neraca') },
      ],
      aktivitasContoh: [
        tr('perangkat_desa', 'aktivitas.a1', 'Menyetujui keanggotaan UMKM baru'),
        tr('perangkat_desa', 'aktivitas.a2', 'Menerbitkan laporan transparansi dana Q1'),
      ],
      widgets: [
        {
          id: 'verifikasi',
          title: tr('perangkat_desa', 'widgets.verifikasiTitle', 'Persetujuan keanggotaan'),
          description: tr('perangkat_desa', 'widgets.verifikasiDesc', 'Legitimasi peran UMKM, agen, dan kontributor.'),
          fase: '0',
          href: href(d, 'kelola/keanggotaan'),
        },
        {
          id: 'validasi',
          title: tr('perangkat_desa', 'widgets.validasiTitle', 'Validasi kartu lestari'),
          description: tr('perangkat_desa', 'widgets.validasiDesc', 'Setujui kartu aksi Naik Kelas dan sertifikasi UMKM.'),
          fase: '1',
          href: href(d, 'kelola/validasi-kartu'),
        },
        {
          id: 'dana',
          title: tr('perangkat_desa', 'widgets.danaTitle', 'Transparansi dana'),
          description: tr('perangkat_desa', 'widgets.danaDesc', 'Aliran dana konservasi desa untuk akuntabilitas pekon.'),
          fase: '3',
          href: href(d, 'lestari/dana'),
        },
        {
          id: 'data',
          title: tr('perangkat_desa', 'widgets.laporanTitle', 'Anjungan data'),
          description: tr('perangkat_desa', 'widgets.laporanDesc', 'Ringkasan kinerja wisata dan laporan desa.'),
          fase: '3',
          href: href(d, 'data'),
        },
        {
          id: 'kelola',
          title: tr('perangkat_desa', 'widgets.kelolaTitle', 'Konsol kelola'),
          description: tr('perangkat_desa', 'widgets.kelolaDesc', 'Pusat pengelolaan operasional desa.'),
          fase: '0',
          href: href(d, 'kelola'),
        },
      ],
    },
    admin: {
      kode: 'admin',
      tagline: tr('admin', 'tagline', 'Steward platform'),
      deskripsi: tr('admin', 'deskripsi', 'Moderasi lintas-tenant, konfigurasi sistem, provisioning desa baru (modul Nusantara).'),
      fase: 'F0–F4',
      nav: [
        { id: 'ringkasan', label: tr('admin', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'tenant', label: tr('admin', 'nav.tenant', 'Tenant desa'), segment: '/tenant', segera: true },
        { id: 'moderasi', label: tr('admin', 'nav.moderasi', 'Moderasi'), segment: '/moderasi', segera: true },
        { id: 'sistem', label: tr('admin', 'nav.sistem', 'Konfigurasi'), segment: '/sistem', segera: true },
        { id: 'nusantara', label: tr('admin', 'nav.nusantara', 'Nusantara'), segment: '/nusantara', segera: true },
      ],
      stats: [
        { id: 'desa', label: tr('admin', 'stats.desaLabel', 'Desa aktif'), value: '—' },
        { id: 'pengguna', label: tr('admin', 'stats.penggunaLabel', 'Pengguna'), value: '—' },
        { id: 'moderasi', label: tr('admin', 'stats.moderasiLabel', 'Antrian moderasi'), value: 0 },
        { id: 'kesehatan', label: tr('admin', 'stats.kesehatanLabel', 'Kesehatan sistem'), value: tr('admin', 'stats.kesehatanValue', 'OK') },
      ],
      aksiCepat: [
        { id: 'tenant', label: tr('admin', 'aksi.tenant', 'Provisioning desa'), href: '/admin/dasbor/tenant', primary: true, segera: true },
        { id: 'discovery', label: tr('admin', 'aksi.discovery', 'Discovery global'), href: '/jelajah' },
        { id: 'flagship', label: tr('admin', 'aksi.flagship', 'Dasbor desa mitra'), href: '/teluk-kiluan/dasbor/kontributor' },
      ],
      modulTerkait: [
        { label: tr('admin', 'modul.nusantara', 'Nusantara (F4)'), href: '/admin/dasbor/nusantara' },
        { label: tr('admin', 'modul.healthApi', 'Health API'), href: 'https://api.sigerciv.com/api/v1/sehat' },
      ],
      aktivitasContoh: [
        tr('admin', 'aktivitas.a1', 'Tenant baru dalam antrian onboarding'),
        tr('admin', 'aktivitas.a2', 'Audit log RBAC lintas desa'),
      ],
      widgets: [
        {
          id: 'moderasi',
          title: tr('admin', 'widgets.moderasiTitle', 'Moderasi lintas-desa'),
          description: tr('admin', 'widgets.moderasiDesc', 'Antrian konten dan laporan pengguna.'),
          fase: '0',
          segera: true,
        },
        {
          id: 'keanggotaan',
          title: tr('admin', 'widgets.keanggotaanTitle', 'Kelola peran & keanggotaan'),
          description: tr('admin', 'widgets.keanggotaanDesc', 'RBAC dan scope per tenant.'),
          fase: '0',
          segera: true,
        },
        {
          id: 'sistem',
          title: tr('admin', 'widgets.sistemTitle', 'Konfigurasi platform'),
          description: tr('admin', 'widgets.sistemDesc', 'Parameter sistem dan integrasi.'),
          fase: '0',
          segera: true,
        },
        {
          id: 'nusantara',
          title: tr('admin', 'widgets.nusantaraTitle', 'Provisioning Nusantara'),
          description: tr('admin', 'widgets.nusantaraDesc', 'White-label dan replikasi desa mitra.'),
          fase: '4',
          placeholder: true,
          href: '/admin/dasbor/nusantara',
        },
      ],
    },
  }
}

/**
 * Dasbor wisatawan lintas desa — tidak terikat satu desa di URL.
 * Beri `t` (namespace `dasbor.wisatawan`) untuk teks sesuai locale;
 * tanpa `t` jatuh ke teks Bahasa Indonesia.
 */
export function konfigDasborWisatawan(t?: PenerjemahDasbor, desaPilot = 'teluk-kiluan'): DashboardPeranConfig {
  const tr = (key: string, fallback: string) => (t ? t(key) : fallback)
  return {
    kode: 'wisatawan',
    tagline: tr('tagline', 'Sigerciv · Lampung'),
    deskripsi: tr(
      'deskripsi',
      'Jelajah desa wisata di seluruh Lampung, kelola wishlist & Paspor Lestari, dan kontribusi untuk pariwisata.',
    ),
    fase: 'F0–F2',
    nav: [
      { id: 'ringkasan', label: tr('nav.ringkasan', 'Ringkasan'), segment: '' },
      { id: 'jelajah', label: tr('nav.jelajah', 'Jelajah desa'), segment: '/jelajah', href: RUTE_WISATAWAN.discovery },
      { id: 'wishlist', label: tr('nav.wishlist', 'Wishlist'), segment: '/wishlist', href: RUTE_WISATAWAN.wishlist },
      { id: 'paspor', label: tr('nav.paspor', 'Paspor Lestari'), segment: '/paspor', href: RUTE_WISATAWAN.paspor },
      { id: 'booking', label: tr('nav.pesanan', 'Pesanan saya'), segment: '/pesanan', href: `/${desaPilot}/pesanan` },
      { id: 'keanggotaan', label: tr('nav.peran', 'Peran & keanggotaan'), segment: '/peran', href: `${RUTE_DASBOR_WISATAWAN}/peran` },
      { id: 'akun', label: tr('nav.akun', 'Akun & preferensi'), segment: '/akun', href: RUTE_WISATAWAN.akun },
    ],
    stats: [
      {
        id: 'wishlist',
        label: tr('stats.wishlistLabel', 'Item tersimpan'),
        value: '—',
        hint: tr('stats.wishlistHint', 'Lintas desa'),
        href: RUTE_WISATAWAN.wishlist,
      },
      {
        id: 'stempel',
        label: tr('stats.stempelLabel', 'Stempel paspor'),
        value: 0,
        href: RUTE_WISATAWAN.paspor,
      },
      {
        id: 'kontrib',
        label: tr('stats.kontribLabel', 'Kontribusi'),
        value: 0,
        hint: tr('stats.kontribHint', 'Fase 1'),
        href: RUTE_WISATAWAN.discovery,
      },
      {
        id: 'poin',
        label: tr('stats.poinLabel', 'Poin'),
        value: 0,
        hint: tr('stats.poinHint', 'Per desa'),
        href: `/${desaPilot}/saya/lencana`,
      },
    ],
    aksiCepat: [
      { id: 'cari', label: tr('aksi.cari', 'Jelajah desa wisata'), href: RUTE_WISATAWAN.discovery, primary: true },
      { id: 'wishlist', label: tr('aksi.wishlist', 'Wishlist saya'), href: RUTE_WISATAWAN.wishlist },
      { id: 'paspor', label: tr('aksi.paspor', 'Paspor Lestari'), href: RUTE_WISATAWAN.paspor },
      { id: 'peran', label: tr('aksi.peran', 'Peran & keanggotaan'), href: `${RUTE_DASBOR_WISATAWAN}/peran` },
      { id: 'akun', label: tr('aksi.akun', 'Akun & preferensi'), href: RUTE_WISATAWAN.akun },
    ],
    modulTerkait: [
      { label: tr('modul.discovery', 'Discovery Lampung'), href: RUTE_WISATAWAN.discovery },
      { label: tr('modul.wishlist', 'Wishlist'), href: RUTE_WISATAWAN.wishlist },
      { label: tr('modul.paspor', 'Paspor Lestari'), href: RUTE_WISATAWAN.paspor },
    ],
    aktivitasContoh: [
      tr('aktivitas.a1', 'Menyimpan paket snorkeling dari desa lain ke wishlist'),
      tr('aktivitas.a2', 'Menyelesaikan micro-lesson kode etik wisata'),
      tr('aktivitas.a3', 'Mengumpulkan stempel misi di beberapa desa wisata'),
    ],
    widgets: [
      {
        id: 'wishlist',
        title: tr('widgets.wishlistTitle', 'Wishlist saya'),
        description: tr('widgets.wishlistDesc', 'Destinasi, paket, dan misi dari desa mana pun di Lampung.'),
        fase: '0',
        href: RUTE_WISATAWAN.wishlist,
      },
      {
        id: 'paspor',
        title: tr('widgets.pasporTitle', 'Paspor Lestari'),
        description: tr('widgets.pasporDesc', 'Kumpulkan stempel dari misi lestari yang terverifikasi.'),
        fase: '2',
        href: RUTE_WISATAWAN.paspor,
      },
      {
        id: 'booking',
        title: tr('widgets.bookingTitle', 'Pesanan & booking'),
        description: tr('widgets.bookingDesc', 'Riwayat pemesanan paket dan layanan.'),
        fase: '2',
        href: `/${desaPilot}/pesanan`,
      },
      {
        id: 'kontrib',
        title: tr('widgets.kontribTitle', 'Kontribusi saya'),
        description: tr('widgets.kontribDesc', 'Foto, tips, dan koreksi data — per desa yang Anda kunjungi.'),
        fase: '1',
        href: RUTE_WISATAWAN.discovery,
      },
      {
        id: 'peran',
        title: tr('widgets.peranTitle', 'Peran & keanggotaan'),
        description: tr('widgets.peranDesc', 'Ajukan peran baru atau pantau status pengajuan ke desa wisata.'),
        fase: '0',
        href: `${RUTE_DASBOR_WISATAWAN}/peran`,
      },
      {
        id: 'poin',
        title: tr('widgets.poinTitle', 'Poin & lencana'),
        description: tr('widgets.poinDesc', 'Saldo poin dan badge per desa wisata.'),
        fase: '1',
        href: `/${desaPilot}/saya/lencana`,
      },
    ],
  }
}
