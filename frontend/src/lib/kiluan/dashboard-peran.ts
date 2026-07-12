import type { PeranKode } from './peran'
import { RUTE_WISATAWAN } from './rute-sigerciv'

export interface DashboardNavItem {
  id: string
  label: string
  /** path relatif dasbor, mis. "" = ringkasan, "/destinasi" = sub-halaman */
  segment: string
  /** Tautan absolut — mengabaikan segment + base dasbor */
  href?: string
  segera?: boolean
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
}

export interface DashboardQuickAction {
  id: string
  label: string
  href: string
  primary?: boolean
  segera?: boolean
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
    pokdarwis: {
      kode: 'pokdarwis',
      tagline: tr('pokdarwis', 'tagline', 'Pengelola desa wisata'),
      deskripsi: tr('pokdarwis', 'deskripsi', 'Kelola destinasi, kurasi konten komunitas, pantau etalase, dan siapkan dana konservasi.'),
      fase: 'F0–F3',
      nav: [
        { id: 'ringkasan', label: tr('pokdarwis', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'destinasi', label: tr('pokdarwis', 'nav.destinasi', 'Destinasi'), segment: '/destinasi' },
        { id: 'kurasi', label: tr('pokdarwis', 'nav.kurasi', 'Antrian kurasi'), segment: '/kurasi' },
        { id: 'keanggotaan', label: tr('pokdarwis', 'nav.keanggotaan', 'Keanggotaan'), segment: '/keanggotaan', segera: true },
        { id: 'dana', label: tr('pokdarwis', 'nav.dana', 'Dana konservasi'), segment: '/dana', segera: true },
      ],
      stats: [
        { id: 'publik', label: tr('pokdarwis', 'stats.publikLabel', 'Destinasi publik'), value: '—' },
        { id: 'draft', label: tr('pokdarwis', 'stats.draftLabel', 'Draft'), value: '—' },
        { id: 'layanan', label: tr('pokdarwis', 'stats.layananLabel', 'Layanan'), value: '—' },
        { id: 'kontrib', label: tr('pokdarwis', 'stats.kontribLabel', 'Kontribusi menunggu'), value: '—', hint: tr('pokdarwis', 'stats.kontribHint', 'Antrian kurasi'), fase: '1' },
      ],
      aksiCepat: [
        { id: 'kelola', label: tr('pokdarwis', 'aksi.kelola', 'Kelola destinasi'), href: href(d, 'kelola/destinasi'), primary: true },
        { id: 'validasi', label: tr('pokdarwis', 'aksi.validasi', 'Validasi kartu'), href: href(d, 'kelola/validasi-kartu'), segera: false },
        { id: 'kurasi', label: tr('pokdarwis', 'aksi.kurasi', 'Kurasi konten'), href: href(d, 'kelola/kurasi'), segera: false },
        { id: 'baru', label: tr('pokdarwis', 'aksi.baru', '+ Spot baru'), href: href(d, 'kelola/destinasi/baru') },
        { id: 'layanan', label: tr('pokdarwis', 'aksi.layanan', 'Kelola layanan'), href: href(d, 'kelola/layanan') },
        { id: 'etalase', label: tr('pokdarwis', 'aksi.etalase', 'Lihat etalase publik'), href: `/${d}` },
      ],
      modulTerkait: [
        { label: tr('pokdarwis', 'modul.crud', 'Kelola desa (CRUD)'), href: href(d, 'kelola') },
        { label: tr('pokdarwis', 'modul.anjungan', 'Anjungan Data'), href: href(d, 'neraca-regeneratif') },
        { label: tr('pokdarwis', 'modul.dayaDukung', 'Daya dukung'), href: href(d, 'daya-dukung') },
      ],
      aktivitasContoh: [
        tr('pokdarwis', 'aktivitas.a1', 'Mempublikasikan spot unggulan desa'),
        tr('pokdarwis', 'aktivitas.a2', 'Menyetujui kontribusi foto dari wisatawan'),
      ],
      widgets: [
        {
          id: 'destinasi',
          title: tr('pokdarwis', 'widgets.destinasiTitle', 'Kelola destinasi'),
          description: tr('pokdarwis', 'widgets.destinasiDesc', 'Spot, layanan, kalender aktivitas — modul F0 aktif.'),
          fase: '0',
          href: href(d, 'kelola/destinasi'),
        },
        {
          id: 'kurasi',
          title: tr('pokdarwis', 'widgets.kurasiTitle', 'Dapur Konten'),
          description: tr('pokdarwis', 'widgets.kurasiDesc', 'Antrian kurasi kontribusi wisatawan dan paket agen.'),
          fase: '1',
          href: href(d, 'kelola/kurasi'),
        },
        {
          id: 'naik-kelas',
          title: tr('pokdarwis', 'widgets.naikKelasTitle', 'Validasi Naik Kelas'),
          description: tr('pokdarwis', 'widgets.naikKelasDesc', 'Setujui kartu aksi dan tingkat sertifikasi UMKM.'),
          fase: '1',
          href: href(d, 'kelola/validasi-kartu'),
        },
        {
          id: 'keanggotaan',
          title: tr('pokdarwis', 'widgets.keanggotaanTitle', 'Persetujuan keanggotaan'),
          description: tr('pokdarwis', 'widgets.keanggotaanDesc', 'Aktivasi peran baru di desa.'),
          fase: '0',
          segera: true,
        },
        {
          id: 'dana',
          title: tr('pokdarwis', 'widgets.danaTitle', 'Dana konservasi'),
          description: tr('pokdarwis', 'widgets.danaDesc', 'Ringkasan kunjungan dan aliran dana lestari.'),
          fase: '3',
          placeholder: true,
        },
      ],
    },
    umkm: {
      kode: 'umkm',
      tagline: tr('umkm', 'tagline', 'Pelaku usaha lokal'),
      deskripsi: tr('umkm', 'deskripsi', 'Daftar produk & jasa, kelola pesanan, dan pantau performa di Pasar Desa.'),
      fase: 'F1–F3',
      nav: [
        { id: 'ringkasan', label: tr('umkm', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'produk', label: tr('umkm', 'nav.produk', 'Produk & jasa'), segment: '/produk' },
        { id: 'layanan', label: tr('umkm', 'nav.layanan', 'Layanan wisata'), segment: '/layanan', segera: false },
        { id: 'pesanan', label: tr('umkm', 'nav.pesanan', 'Pesanan'), segment: '/pesanan', segera: true },
        { id: 'performa', label: tr('umkm', 'nav.performa', 'Performa'), segment: '/performa', segera: true },
        { id: 'sertifikasi', label: tr('umkm', 'nav.sertifikasi', 'Naik Kelas Lestari'), segment: '/sertifikasi', segera: false },
      ],
      stats: [
        { id: 'produk', label: tr('umkm', 'stats.produkLabel', 'Produk aktif'), value: 0, hint: tr('umkm', 'stats.produkHint', 'Fase 1') },
        { id: 'pesanan', label: tr('umkm', 'stats.pesananLabel', 'Pesanan bulan ini'), value: 0, hint: tr('umkm', 'stats.pesananHint', 'Fase 2') },
        { id: 'rating', label: tr('umkm', 'stats.ratingLabel', 'Rating'), value: '—' },
        { id: 'tingkat', label: tr('umkm', 'stats.tingkatLabel', 'Tingkat lestari'), value: tr('umkm', 'stats.tingkatValue', 'Tunas'), hint: tr('umkm', 'stats.tingkatHint', 'Fase 1') },
      ],
      aksiCepat: [
        { id: 'pasar', label: tr('umkm', 'aksi.pasar', 'Buka Pasar Desa'), href: href(d, 'pasar'), primary: true },
        { id: 'produk', label: tr('umkm', 'aksi.produk', 'Tambah produk'), href: href(d, 'saya/umkm/produk'), segera: false },
        { id: 'layanan', label: tr('umkm', 'aksi.layanan', 'Tambah layanan'), href: href(d, 'saya/umkm/layanan'), segera: false },
        { id: 'kartu', label: tr('umkm', 'aksi.kartu', 'Kartu aksi'), href: href(d, 'naik-kelas'), segera: false },
        { id: 'naik', label: tr('umkm', 'aksi.naik', 'Naik kelas'), href: href(d, 'naik-kelas'), segera: false },
      ],
      modulTerkait: [
        { label: tr('umkm', 'modul.pasar', 'Pasar Desa'), href: href(d, 'pasar') },
        { label: tr('umkm', 'modul.dermaga', 'Dermaga (booking)'), href: href(d, 'paket') },
        { label: tr('umkm', 'modul.performa', 'Performa UMKM'), href: href(d, 'neraca-regeneratif') },
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
        },
        {
          id: 'layanan',
          title: tr('umkm', 'widgets.layananTitle', 'Layanan wisata'),
          description: tr('umkm', 'widgets.layananDesc', 'Transportasi, pemandu, sewa alat — milik UMKM Anda di etalase desa.'),
          fase: '0',
          href: href(d, 'saya/umkm/layanan'),
        },
        {
          id: 'pesanan',
          title: tr('umkm', 'widgets.pesananTitle', 'Pesanan masuk'),
          description: tr('umkm', 'widgets.pesananDesc', 'Booking manual thin-F2 dari wisatawan.'),
          fase: '2',
          segera: true,
        },
        {
          id: 'naik-kelas',
          title: tr('umkm', 'widgets.naikKelasTitle', 'Naik Kelas Lestari'),
          description: tr('umkm', 'widgets.naikKelasDesc', 'Kartu aksi dan progres tingkat Tunas → Lumba-Lumba.'),
          fase: '1',
          href: href(d, 'naik-kelas'),
        },
        {
          id: 'verifikasi',
          title: tr('umkm', 'widgets.verifikasiTitle', 'Status verifikasi'),
          description: tr('umkm', 'widgets.verifikasiDesc', 'Profil UMKM dan legitimasi penyedia lokal.'),
          fase: '0',
          href: href(d, 'pasar'),
        },
        {
          id: 'performa',
          title: tr('umkm', 'widgets.performaTitle', 'Performa ringkas'),
          description: tr('umkm', 'widgets.performaDesc', 'Metrik penjualan dan dampak lestari.'),
          fase: '3',
          placeholder: true,
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
        { id: 'paket', label: tr('agen', 'nav.paket', 'Paket saya'), segment: '/paket' },
        { id: 'layanan', label: tr('agen', 'nav.layanan', 'Layanan wisata'), segment: '/layanan', segera: false },
        { id: 'jadwal', label: tr('agen', 'nav.jadwal', 'Kuota & jadwal'), segment: '/jadwal', segera: true },
        { id: 'booking', label: tr('agen', 'nav.booking', 'Booking masuk'), segment: '/booking', segera: true },
      ],
      stats: [
        { id: 'paket', label: tr('agen', 'stats.paketLabel', 'Paket publik'), value: 0 },
        { id: 'draft', label: tr('agen', 'stats.draftLabel', 'Dalam review'), value: 0 },
        { id: 'kuota', label: tr('agen', 'stats.kuotaLabel', 'Kuota terisi'), value: '—', hint: tr('agen', 'stats.kuotaHint', 'Fase 2') },
        { id: 'pendapatan', label: tr('agen', 'stats.pendapatanLabel', 'Pendapatan'), value: '—', hint: tr('agen', 'stats.pendapatanHint', 'Fase 2') },
      ],
      aksiCepat: [
        { id: 'buat', label: tr('agen', 'aksi.buat', 'Buat paket baru'), href: href(d, 'saya/paket'), primary: true, segera: false },
        { id: 'layanan', label: tr('agen', 'aksi.layanan', 'Tambah layanan'), href: href(d, 'saya/agen/layanan'), segera: false },
        { id: 'agen', label: tr('agen', 'aksi.profil', 'Profil agen'), href: href(d, 'agen'), segera: true },
        { id: 'kalender', label: tr('agen', 'aksi.kalender', 'Kalender aktivitas'), href: href(d, 'kalender') },
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
        },
        {
          id: 'layanan',
          title: tr('agen', 'widgets.layananTitle', 'Layanan wisata'),
          description: tr('agen', 'widgets.layananDesc', 'Transportasi, pemandu, dan layanan pendukung paket — milik akun agen Anda.'),
          fase: '0',
          href: href(d, 'saya/agen/layanan'),
        },
        {
          id: 'jadwal',
          title: tr('agen', 'widgets.jadwalTitle', 'Kuota & jadwal'),
          description: tr('agen', 'widgets.jadwalDesc', 'Atur slot dan kapasitas paket.'),
          fase: '1',
          segera: true,
        },
        {
          id: 'booking',
          title: tr('agen', 'widgets.bookingTitle', 'Pesanan paket'),
          description: tr('agen', 'widgets.bookingDesc', 'Booking masuk dari wisatawan.'),
          fase: '2',
          segera: true,
        },
        {
          id: 'sertifikasi',
          title: tr('agen', 'widgets.sertifikasiTitle', 'Progres sertifikasi'),
          description: tr('agen', 'widgets.sertifikasiDesc', 'Tingkat lestari agen lokal.'),
          fase: '1',
          href: href(d, 'naik-kelas'),
        },
      ],
    },
    kontributor: {
      kode: 'kontributor',
      tagline: tr('kontributor', 'tagline', 'Relawan data komunitas'),
      deskripsi: tr('kontributor', 'deskripsi', 'Sumbang foto, tips, atau koreksi data destinasi — dapat poin dan lencana.'),
      fase: 'F1',
      nav: [
        { id: 'ringkasan', label: tr('kontributor', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'kontribusi', label: tr('kontributor', 'nav.kontribusi', 'Kontribusi saya'), segment: '/kontribusi' },
        { id: 'lencana', label: tr('kontributor', 'nav.lencana', 'Lencana'), segment: '/lencana' },
        { id: 'leaderboard', label: tr('kontributor', 'nav.leaderboard', 'Leaderboard'), segment: '/leaderboard' },
      ],
      stats: [
        { id: 'total', label: tr('kontributor', 'stats.totalLabel', 'Kontribusi'), value: 0 },
        { id: 'diterima', label: tr('kontributor', 'stats.diterimaLabel', 'Diterima'), value: 0 },
        { id: 'poin', label: tr('kontributor', 'stats.poinLabel', 'Poin'), value: 0 },
        { id: 'peringkat', label: tr('kontributor', 'stats.peringkatLabel', 'Peringkat desa'), value: '—' },
      ],
      aksiCepat: [
        { id: 'baru', label: tr('kontributor', 'aksi.baru', 'Kontribusi baru'), href: href(d, 'kontribusi'), primary: true, segera: false },
        { id: 'lencana', label: tr('kontributor', 'aksi.lencana', 'Lihat lencana'), href: href(d, 'saya/lencana'), segera: false },
        { id: 'board', label: tr('kontributor', 'aksi.board', 'Leaderboard'), href: href(d, 'leaderboard'), segera: false },
      ],
      modulTerkait: [
        { label: tr('kontributor', 'modul.kontribusi', 'Kontribusi'), href: href(d, 'kontribusi') },
        { label: tr('kontributor', 'modul.lencana', 'Lencana Warga'), href: href(d, 'lencana') },
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
        },
        {
          id: 'poin',
          title: tr('kontributor', 'widgets.poinTitle', 'Poin & lencana'),
          description: tr('kontributor', 'widgets.poinDesc', 'Gamifikasi kontribusi komunitas.'),
          fase: '1',
          href: href(d, 'saya/lencana'),
        },
        {
          id: 'leaderboard',
          title: tr('kontributor', 'widgets.leaderboardTitle', 'Leaderboard'),
          description: tr('kontributor', 'widgets.leaderboardDesc', 'Peringkat kontributor aktif di desa.'),
          fase: '1',
          href: href(d, 'leaderboard'),
        },
        {
          id: 'misi',
          title: tr('kontributor', 'widgets.misiTitle', 'Misi kontribusi'),
          description: tr('kontributor', 'widgets.misiDesc', 'Quest data lapangan untuk relawan.'),
          fase: '2',
          segera: true,
        },
      ],
    },
    organisasi: {
      kode: 'organisasi',
      tagline: tr('organisasi', 'tagline', 'Mitra konservasi & riset'),
      deskripsi: tr('organisasi', 'deskripsi', 'Program konservasi, data ekologi, dan sponsor reinvestment bersama Organisasi.'),
      fase: 'F1–F3',
      nav: [
        { id: 'ringkasan', label: tr('organisasi', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'program', label: tr('organisasi', 'nav.program', 'Program'), segment: '/program', segera: true },
        { id: 'ekologi', label: tr('organisasi', 'nav.ekologi', 'Data ekologi'), segment: '/ekologi', segera: true },
        { id: 'sponsor', label: tr('organisasi', 'nav.sponsor', 'Sponsor'), segment: '/sponsor', segera: true },
      ],
      stats: [
        { id: 'program', label: tr('organisasi', 'stats.programLabel', 'Program aktif'), value: 0 },
        { id: 'indikator', label: tr('organisasi', 'stats.indikatorLabel', 'Indikator terpantau'), value: '—', hint: tr('organisasi', 'stats.indikatorHint', 'Fase 3') },
        { id: 'sponsor', label: tr('organisasi', 'stats.sponsorLabel', 'Dana disponsori'), value: '—' },
        { id: 'laporan', label: tr('organisasi', 'stats.laporanLabel', 'Laporan'), value: 0 },
      ],
      aksiCepat: [
        { id: 'monitor', label: tr('organisasi', 'aksi.monitor', 'Monitoring ekologi'), href: href(d, 'monitoring'), primary: true, segera: true },
        { id: 'dana', label: tr('organisasi', 'aksi.dana', 'Dana konservasi'), href: href(d, 'dana-konservasi'), segera: true },
        { id: 'neraca', label: tr('organisasi', 'aksi.neraca', 'Neraca regeneratif'), href: href(d, 'neraca-regeneratif'), segera: true },
      ],
      modulTerkait: [
        { label: tr('organisasi', 'modul.monitoring', 'Monitoring Ekologi'), href: href(d, 'monitoring') },
        { label: tr('organisasi', 'modul.jejak', 'Jejak Lestari'), href: href(d, 'neraca-regeneratif') },
      ],
      aktivitasContoh: [
        tr('organisasi', 'aktivitas.a1', 'Mengunggah data indeks karang Q2'),
        tr('organisasi', 'aktivitas.a2', 'Menyponsori program mangrove'),
      ],
      widgets: [
        {
          id: 'program',
          title: tr('organisasi', 'widgets.programTitle', 'Program konservasi'),
          description: tr('organisasi', 'widgets.programDesc', 'Kolaborasi riset dan aksi lapangan bersama Organisasi.'),
          fase: '3',
          placeholder: true,
        },
        {
          id: 'ekologi',
          title: tr('organisasi', 'widgets.ekologiTitle', 'Data ekologi'),
          description: tr('organisasi', 'widgets.ekologiDesc', 'Monitoring indeks karang, mangrove, dan biodiversitas.'),
          fase: '3',
          placeholder: true,
        },
        {
          id: 'sponsor',
          title: tr('organisasi', 'widgets.sponsorTitle', 'Sponsor & reinvestment'),
          description: tr('organisasi', 'widgets.sponsorDesc', 'Alokasi dana mitra ke program lestari.'),
          fase: '3',
          placeholder: true,
        },
        {
          id: 'kontak',
          title: tr('organisasi', 'widgets.kontakTitle', 'Kanal kolaborasi'),
          description: tr('organisasi', 'widgets.kontakDesc', 'Profil mitra dan kontak kerja sama desa.'),
          fase: '0',
          href: href(d, 'tentang'),
        },
      ],
    },
    perangkat_desa: {
      kode: 'perangkat_desa',
      tagline: tr('perangkat_desa', 'tagline', 'Tata kelola & legitimasi'),
      deskripsi: tr('perangkat_desa', 'deskripsi', 'Verifikasi keanggotaan, legitimasi kebijakan desa, dan transparansi dana untuk pekon.'),
      fase: 'F0–F3',
      nav: [
        { id: 'ringkasan', label: tr('perangkat_desa', 'nav.ringkasan', 'Ringkasan'), segment: '' },
        { id: 'verifikasi', label: tr('perangkat_desa', 'nav.verifikasi', 'Verifikasi'), segment: '/verifikasi', segera: true },
        { id: 'kebijakan', label: tr('perangkat_desa', 'nav.kebijakan', 'Kebijakan'), segment: '/kebijakan', segera: true },
        { id: 'transparansi', label: tr('perangkat_desa', 'nav.transparansi', 'Transparansi'), segment: '/transparansi', segera: true },
        { id: 'kelola', label: tr('perangkat_desa', 'nav.kelola', 'Kelola operasional'), segment: '/operasional' },
      ],
      stats: [
        { id: 'anggota', label: tr('perangkat_desa', 'stats.anggotaLabel', 'Keanggotaan pending'), value: '—' },
        { id: 'verif', label: tr('perangkat_desa', 'stats.verifLabel', 'Verifikasi bulan ini'), value: 0 },
        { id: 'dana', label: tr('perangkat_desa', 'stats.danaLabel', 'Dana konservasi'), value: '—', hint: tr('perangkat_desa', 'stats.danaHint', 'Fase 3') },
        { id: 'spot', label: tr('perangkat_desa', 'stats.spotLabel', 'Spot aktif'), value: '—' },
      ],
      aksiCepat: [
        { id: 'kelola', label: tr('perangkat_desa', 'aksi.kelola', 'Dashboard kelola'), href: href(d, 'kelola'), primary: true },
        { id: 'dana', label: tr('perangkat_desa', 'aksi.dana', 'Laporan dana'), href: href(d, 'dana-konservasi'), segera: true },
        { id: 'daya', label: tr('perangkat_desa', 'aksi.daya', 'Daya dukung'), href: href(d, 'daya-dukung'), segera: true },
        { id: 'profil', label: tr('perangkat_desa', 'aksi.profil', 'Profil desa'), href: href(d, 'tentang') },
      ],
      modulTerkait: [
        { label: tr('perangkat_desa', 'modul.kelola', 'Kelola desa'), href: href(d, 'kelola') },
        { label: tr('perangkat_desa', 'modul.dana', 'Dana konservasi'), href: href(d, 'dana-konservasi') },
        { label: tr('perangkat_desa', 'modul.neraca', 'Neraca regeneratif'), href: href(d, 'neraca-regeneratif') },
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
          segera: true,
        },
        {
          id: 'kelola',
          title: tr('perangkat_desa', 'widgets.kelolaTitle', 'Kelola operasional'),
          description: tr('perangkat_desa', 'widgets.kelolaDesc', 'Dashboard pengelolaan desa dan kebijakan.'),
          fase: '0',
          href: href(d, 'kelola'),
        },
        {
          id: 'dana',
          title: tr('perangkat_desa', 'widgets.danaTitle', 'Transparansi dana'),
          description: tr('perangkat_desa', 'widgets.danaDesc', 'Aliran dana konservasi desa.'),
          fase: '3',
          placeholder: true,
        },
        {
          id: 'daya-dukung',
          title: tr('perangkat_desa', 'widgets.dayaDukungTitle', 'Daya dukung spot'),
          description: tr('perangkat_desa', 'widgets.dayaDukungDesc', 'Lampu hijau/kuning/merah per destinasi.'),
          fase: '3',
          placeholder: true,
        },
        {
          id: 'laporan',
          title: tr('perangkat_desa', 'widgets.laporanTitle', 'Laporan desa'),
          description: tr('perangkat_desa', 'widgets.laporanDesc', 'Ringkasan kinerja wisata regeneratif.'),
          fase: '3',
          placeholder: true,
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
        { id: 'flagship', label: tr('admin', 'aksi.flagship', 'Dasbor desa mitra'), href: '/teluk-kiluan/dasbor/pokdarwis' },
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
export function konfigDasborWisatawan(t?: PenerjemahDasbor): DashboardPeranConfig {
  const tr = (key: string, fallback: string) => (t ? t(key) : fallback)
  return {
    kode: 'wisatawan',
    tagline: tr('tagline', 'Sigerciv · Lampung'),
    deskripsi: tr(
      'deskripsi',
      'Jelajah desa wisata di seluruh Lampung, kelola wishlist & Paspor Lestari, dan kontribusi untuk pariwisata regeneratif.',
    ),
    fase: 'F0–F2',
    nav: [{ id: 'ringkasan', label: tr('nav.ringkasan', 'Ringkasan'), segment: '' }],
    stats: [
      {
        id: 'wishlist',
        label: tr('stats.wishlistLabel', 'Item tersimpan'),
        value: '—',
        hint: tr('stats.wishlistHint', 'Lintas desa'),
      },
      { id: 'stempel', label: tr('stats.stempelLabel', 'Stempel paspor'), value: 0 },
      {
        id: 'kontrib',
        label: tr('stats.kontribLabel', 'Kontribusi'),
        value: 0,
        hint: tr('stats.kontribHint', 'Fase 1'),
      },
      { id: 'poin', label: tr('stats.poinLabel', 'Poin'), value: 0, hint: tr('stats.poinHint', 'Per desa') },
    ],
    aksiCepat: [
      { id: 'cari', label: tr('aksi.cari', 'Jelajah desa wisata'), href: RUTE_WISATAWAN.discovery, primary: true },
      { id: 'wishlist', label: tr('aksi.wishlist', 'Wishlist saya'), href: RUTE_WISATAWAN.wishlist },
      { id: 'paspor', label: tr('aksi.paspor', 'Paspor Lestari'), href: RUTE_WISATAWAN.paspor },
      { id: 'akun', label: tr('aksi.akun', 'Akun & preferensi'), href: RUTE_WISATAWAN.akun },
    ],
    modulTerkait: [
      { label: tr('modul.discovery', 'Discovery Lampung'), href: RUTE_WISATAWAN.discovery },
      { label: tr('modul.wishlist', 'Wishlist'), href: RUTE_WISATAWAN.wishlist },
      { label: tr('modul.paspor', 'Paspor Lestari'), href: RUTE_WISATAWAN.paspor },
    ],
    aktivitasContoh: [
      tr('aktivitas.a1', 'Menyimpan paket snorkeling dari desa lain ke wishlist'),
      tr('aktivitas.a2', 'Menyelesaikan micro-lesson kode etik wisata regeneratif'),
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
        segera: true,
      },
      {
        id: 'kontrib',
        title: tr('widgets.kontribTitle', 'Kontribusi saya'),
        description: tr('widgets.kontribDesc', 'Foto, tips, dan koreksi data — per desa yang Anda kunjungi.'),
        fase: '1',
        href: RUTE_WISATAWAN.discovery,
      },
      {
        id: 'poin',
        title: tr('widgets.poinTitle', 'Poin & lencana'),
        description: tr('widgets.poinDesc', 'Saldo poin dan badge per desa wisata.'),
        fase: '1',
        href: '/saya/lencana',
        segera: true,
      },
    ],
  }
}
