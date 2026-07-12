import type { PeranKode } from './peran'

export interface DashboardNavItem {
  id: string
  label: string
  /** path relatif dasbor, mis. "" = ringkasan, "/destinasi" = sub-halaman */
  segment: string
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

export function konfigDasborPeran(desaSlug: string): Record<PeranKode, DashboardPeranConfig> {
  const d = desaSlug
  return {
    wisatawan: {
      kode: 'wisatawan',
      tagline: 'Jelajah & kontribusi',
      deskripsi: 'Rencanakan kunjungan, kelola Paspor Lestari, dan kontribusi foto atau tips ke komunitas.',
      fase: 'F0–F2',
      nav: [
        { id: 'ringkasan', label: 'Ringkasan', segment: '' },
        { id: 'rencana', label: 'Rencana saya', segment: '/rencana', segera: true },
        { id: 'booking', label: 'Pemesanan', segment: '/booking', segera: true },
        { id: 'paspor', label: 'Paspor Lestari', segment: '/paspor' },
        { id: 'kontribusi', label: 'Kontribusi', segment: '/kontribusi' },
      ],
      stats: [
        { id: 'misi', label: 'Misi aktif', value: '—', hint: 'Fase 2' },
        { id: 'stempel', label: 'Stempel paspor', value: 0 },
        { id: 'kontrib', label: 'Kontribusi', value: 0, hint: 'Fase 1' },
        { id: 'poin', label: 'Poin', value: 0, hint: 'Fase 1' },
      ],
      aksiCepat: [
        { id: 'cari', label: 'Cari destinasi', href: '/#discovery', primary: true },
        { id: 'paspor', label: 'Buka Paspor Lestari', href: '/paspor' },
        { id: 'misi', label: 'Lihat misi', href: href(d, 'misi'), segera: true },
        { id: 'kontrib', label: 'Kontribusi data', href: href(d, 'kontribusi'), segera: false },
      ],
      modulTerkait: [
        { label: 'Discovery', href: '/#discovery' },
        { label: 'Misi sigerciv', href: href(d, 'misi') },
        { label: 'Paspor Lestari', href: '/paspor' },
      ],
      aktivitasContoh: [
        'Menyelesaikan micro-lesson kode etik lumba-lumba',
        'Menyimpan spot Pantai Gigi Hiu ke daftar kunjungan',
      ],
      widgets: [
        {
          id: 'booking',
          title: 'Pesanan & booking',
          description: 'Riwayat pemesanan paket dan layanan — alur manual thin-F2.',
          fase: '2',
          segera: true,
        },
        {
          id: 'paspor',
          title: 'Paspor Lestari',
          description: 'Kumpulkan stempel dari misi lestari yang terverifikasi.',
          fase: '2',
          href: '/paspor',
        },
        {
          id: 'misi',
          title: 'Misi berjalan',
          description: 'Quest Penjelajah Lestari dan aksi terverifikasi.',
          fase: '2',
          href: href(d, 'misi'),
          segera: true,
        },
        {
          id: 'kontrib',
          title: 'Kontribusi saya',
          description: 'Foto, tips, dan koreksi data — status kurasi komunitas.',
          fase: '1',
          href: href(d, 'kontribusi'),
        },
        {
          id: 'poin',
          title: 'Poin & lencana',
          description: 'Gamifikasi partisipasi wisatawan di desa.',
          fase: '1',
          href: href(d, 'saya/lencana'),
        },
      ],
    },
    pokdarwis: {
      kode: 'pokdarwis',
      tagline: 'Pengelola desa wisata',
      deskripsi: 'Kelola destinasi, kurasi konten komunitas, pantau etalase, dan siapkan dana konservasi.',
      fase: 'F0–F3',
      nav: [
        { id: 'ringkasan', label: 'Ringkasan', segment: '' },
        { id: 'destinasi', label: 'Destinasi', segment: '/destinasi' },
        { id: 'kurasi', label: 'Antrian kurasi', segment: '/kurasi' },
        { id: 'keanggotaan', label: 'Keanggotaan', segment: '/keanggotaan', segera: true },
        { id: 'dana', label: 'Dana konservasi', segment: '/dana', segera: true },
      ],
      stats: [
        { id: 'publik', label: 'Destinasi publik', value: '—' },
        { id: 'draft', label: 'Draft', value: '—' },
        { id: 'layanan', label: 'Layanan', value: '—' },
        { id: 'kontrib', label: 'Kontribusi menunggu', value: '—', hint: 'Antrian kurasi', fase: '1' },
      ],
      aksiCepat: [
        { id: 'kelola', label: 'Kelola destinasi', href: href(d, 'kelola/destinasi'), primary: true },
        { id: 'validasi', label: 'Validasi kartu', href: href(d, 'kelola/validasi-kartu'), segera: false },
        { id: 'kurasi', label: 'Kurasi konten', href: href(d, 'kelola/kurasi-konten'), segera: false },
        { id: 'baru', label: '+ Spot baru', href: href(d, 'kelola/destinasi/baru') },
        { id: 'layanan', label: 'Kelola layanan', href: href(d, 'kelola/layanan') },
        { id: 'etalase', label: 'Lihat etalase publik', href: `/${d}` },
      ],
      modulTerkait: [
        { label: 'Kelola desa (CRUD)', href: href(d, 'kelola') },
        { label: 'Anjungan Data', href: href(d, 'neraca-regeneratif') },
        { label: 'Daya dukung', href: href(d, 'daya-dukung') },
      ],
      aktivitasContoh: [
        'Mempublikasikan spot Laguna Kiluan',
        'Menyetujui kontribusi foto dari wisatawan',
      ],
      widgets: [
        {
          id: 'destinasi',
          title: 'Kelola destinasi',
          description: 'Spot, layanan, kalender aktivitas — modul F0 aktif.',
          fase: '0',
          href: href(d, 'kelola/destinasi'),
        },
        {
          id: 'kurasi',
          title: 'Dapur Konten',
          description: 'Antrian kurasi kontribusi wisatawan dan paket agen.',
          fase: '1',
          href: href(d, 'kelola/kurasi-konten'),
        },
        {
          id: 'naik-kelas',
          title: 'Validasi Naik Kelas',
          description: 'Setujui kartu aksi dan tingkat sertifikasi UMKM.',
          fase: '1',
          href: href(d, 'kelola/validasi-kartu'),
        },
        {
          id: 'keanggotaan',
          title: 'Persetujuan keanggotaan',
          description: 'Aktivasi peran baru di desa.',
          fase: '0',
          segera: true,
        },
        {
          id: 'dana',
          title: 'Dana konservasi',
          description: 'Ringkasan kunjungan dan aliran dana lestari.',
          fase: '3',
          placeholder: true,
        },
      ],
    },
    umkm: {
      kode: 'umkm',
      tagline: 'Pelaku usaha lokal',
      deskripsi: 'Daftar produk & jasa, kelola pesanan, dan pantau performa di Pasar Desa.',
      fase: 'F1–F3',
      nav: [
        { id: 'ringkasan', label: 'Ringkasan', segment: '' },
        { id: 'produk', label: 'Produk & jasa', segment: '/produk' },
        { id: 'pesanan', label: 'Pesanan', segment: '/pesanan', segera: true },
        { id: 'performa', label: 'Performa', segment: '/performa', segera: true },
        { id: 'sertifikasi', label: 'Naik Kelas Lestari', segment: '/sertifikasi', segera: false },
      ],
      stats: [
        { id: 'produk', label: 'Produk aktif', value: 0, hint: 'Fase 1' },
        { id: 'pesanan', label: 'Pesanan bulan ini', value: 0, hint: 'Fase 2' },
        { id: 'rating', label: 'Rating', value: '—' },
        { id: 'tingkat', label: 'Tingkat lestari', value: 'Tunas', hint: 'Fase 1' },
      ],
      aksiCepat: [
        { id: 'pasar', label: 'Buka Pasar Desa', href: href(d, 'pasar'), primary: true },
        { id: 'produk', label: 'Tambah produk', href: href(d, 'saya/umkm/produk'), segera: false },
        { id: 'kartu', label: 'Kartu aksi', href: href(d, 'naik-kelas'), segera: false },
        { id: 'naik', label: 'Naik kelas', href: href(d, 'naik-kelas'), segera: false },
      ],
      modulTerkait: [
        { label: 'Pasar Desa', href: href(d, 'pasar') },
        { label: 'Dermaga (booking)', href: href(d, 'paket') },
        { label: 'Performa UMKM', href: href(d, 'neraca-regeneratif') },
      ],
      aktivitasContoh: [
        'Mengajukan kartu aksi “tanpa plastik sekali pakai”',
        'Memperbarui harga paket snorkeling',
      ],
      widgets: [
        {
          id: 'produk',
          title: 'Produk & jasa',
          description: 'Katalog Pasar Desa milik UMKM Anda.',
          fase: '1',
          href: href(d, 'saya/umkm/produk'),
        },
        {
          id: 'pesanan',
          title: 'Pesanan masuk',
          description: 'Booking manual thin-F2 dari wisatawan.',
          fase: '2',
          segera: true,
        },
        {
          id: 'naik-kelas',
          title: 'Naik Kelas Lestari',
          description: 'Kartu aksi dan progres tingkat Tunas → Lumba-Lumba.',
          fase: '1',
          href: href(d, 'naik-kelas'),
        },
        {
          id: 'verifikasi',
          title: 'Status verifikasi',
          description: 'Profil UMKM dan legitimasi penyedia lokal.',
          fase: '0',
          href: href(d, 'pasar'),
        },
        {
          id: 'performa',
          title: 'Performa ringkas',
          description: 'Metrik penjualan dan dampak lestari.',
          fase: '3',
          placeholder: true,
        },
      ],
    },
    agen: {
      kode: 'agen',
      tagline: 'Penyusun paket wisata',
      deskripsi: 'Buat itinerary, atur kuota & jadwal, publikasikan paket melalui alur kurasi Pokdarwis.',
      fase: 'F1–F2',
      nav: [
        { id: 'ringkasan', label: 'Ringkasan', segment: '' },
        { id: 'paket', label: 'Paket saya', segment: '/paket' },
        { id: 'jadwal', label: 'Kuota & jadwal', segment: '/jadwal', segera: true },
        { id: 'booking', label: 'Booking masuk', segment: '/booking', segera: true },
      ],
      stats: [
        { id: 'paket', label: 'Paket publik', value: 0 },
        { id: 'draft', label: 'Dalam review', value: 0 },
        { id: 'kuota', label: 'Kuota terisi', value: '—', hint: 'Fase 2' },
        { id: 'pendapatan', label: 'Pendapatan', value: '—', hint: 'Fase 2' },
      ],
      aksiCepat: [
        { id: 'buat', label: 'Buat paket baru', href: href(d, 'saya/paket'), primary: true, segera: false },
        { id: 'agen', label: 'Profil agen', href: href(d, 'agen'), segera: true },
        { id: 'kalender', label: 'Kalender aktivitas', href: href(d, 'kalender') },
      ],
      modulTerkait: [
        { label: 'Paket wisata', href: href(d, 'paket') },
        { label: 'Dapur Konten', href: href(d, 'kontribusi') },
        { label: 'Dermaga', href: href(d, 'paket') },
      ],
      aktivitasContoh: ['Paket “Lumba Pagi + Snorkeling” menunggu kurasi', 'Kuota weekend 80% terisi'],
      widgets: [
        {
          id: 'paket',
          title: 'Editor paket wisata',
          description: 'State machine draft → review → publikasi.',
          fase: '1',
          href: href(d, 'saya/paket'),
        },
        {
          id: 'jadwal',
          title: 'Kuota & jadwal',
          description: 'Atur slot dan kapasitas paket.',
          fase: '1',
          segera: true,
        },
        {
          id: 'booking',
          title: 'Pesanan paket',
          description: 'Booking masuk dari wisatawan.',
          fase: '2',
          segera: true,
        },
        {
          id: 'sertifikasi',
          title: 'Progres sertifikasi',
          description: 'Tingkat lestari agen lokal.',
          fase: '1',
          href: href(d, 'naik-kelas'),
        },
      ],
    },
    kontributor: {
      kode: 'kontributor',
      tagline: 'Relawan data komunitas',
      deskripsi: 'Sumbang foto, tips, atau koreksi data destinasi — dapat poin dan lencana.',
      fase: 'F1',
      nav: [
        { id: 'ringkasan', label: 'Ringkasan', segment: '' },
        { id: 'kontribusi', label: 'Kontribusi saya', segment: '/kontribusi' },
        { id: 'lencana', label: 'Lencana', segment: '/lencana' },
        { id: 'leaderboard', label: 'Leaderboard', segment: '/leaderboard' },
      ],
      stats: [
        { id: 'total', label: 'Kontribusi', value: 0 },
        { id: 'diterima', label: 'Diterima', value: 0 },
        { id: 'poin', label: 'Poin', value: 0 },
        { id: 'peringkat', label: 'Peringkat desa', value: '—' },
      ],
      aksiCepat: [
        { id: 'baru', label: 'Kontribusi baru', href: href(d, 'kontribusi'), primary: true, segera: false },
        { id: 'lencana', label: 'Lihat lencana', href: href(d, 'saya/lencana'), segera: false },
        { id: 'board', label: 'Leaderboard', href: href(d, 'leaderboard'), segera: false },
      ],
      modulTerkait: [
        { label: 'Kontribusi', href: href(d, 'kontribusi') },
        { label: 'Lencana Warga', href: href(d, 'lencana') },
      ],
      aktivitasContoh: ['Mengunggah foto spot Gigi Hiu — menunggu kurasi', 'Mendapat lencana Kontributor Aktif'],
      widgets: [
        {
          id: 'kontrib',
          title: 'Kontribusi saya',
          description: 'Foto, tips, koreksi — dengan status kurasi.',
          fase: '1',
          href: href(d, 'kontribusi'),
        },
        {
          id: 'poin',
          title: 'Poin & lencana',
          description: 'Gamifikasi kontribusi komunitas.',
          fase: '1',
          href: href(d, 'saya/lencana'),
        },
        {
          id: 'leaderboard',
          title: 'Leaderboard',
          description: 'Peringkat kontributor aktif di desa.',
          fase: '1',
          href: href(d, 'leaderboard'),
        },
        {
          id: 'misi',
          title: 'Misi kontribusi',
          description: 'Quest data lapangan untuk relawan.',
          fase: '2',
          segera: true,
        },
      ],
    },
    organisasi: {
      kode: 'organisasi',
      tagline: 'Mitra konservasi & riset',
      deskripsi: 'Program konservasi, data ekologi, dan sponsor reinvestment bersama Pokdarwis.',
      fase: 'F1–F3',
      nav: [
        { id: 'ringkasan', label: 'Ringkasan', segment: '' },
        { id: 'program', label: 'Program', segment: '/program', segera: true },
        { id: 'ekologi', label: 'Data ekologi', segment: '/ekologi', segera: true },
        { id: 'sponsor', label: 'Sponsor', segment: '/sponsor', segera: true },
      ],
      stats: [
        { id: 'program', label: 'Program aktif', value: 0 },
        { id: 'indikator', label: 'Indikator terpantau', value: '—', hint: 'Fase 3' },
        { id: 'sponsor', label: 'Dana disponsori', value: '—' },
        { id: 'laporan', label: 'Laporan', value: 0 },
      ],
      aksiCepat: [
        { id: 'monitor', label: 'Monitoring ekologi', href: href(d, 'monitoring'), primary: true, segera: true },
        { id: 'dana', label: 'Dana konservasi', href: href(d, 'dana-konservasi'), segera: true },
        { id: 'neraca', label: 'Neraca regeneratif', href: href(d, 'neraca-regeneratif'), segera: true },
      ],
      modulTerkait: [
        { label: 'Monitoring Ekologi', href: href(d, 'monitoring') },
        { label: 'Jejak Lestari', href: href(d, 'neraca-regeneratif') },
      ],
      aktivitasContoh: ['Mengunggah data indeks karang Q2', 'Menyponsori program mangrove'],
      widgets: [
        {
          id: 'program',
          title: 'Program konservasi',
          description: 'Kolaborasi riset dan aksi lapangan bersama Pokdarwis.',
          fase: '3',
          placeholder: true,
        },
        {
          id: 'ekologi',
          title: 'Data ekologi',
          description: 'Monitoring indeks karang, mangrove, dan biodiversitas.',
          fase: '3',
          placeholder: true,
        },
        {
          id: 'sponsor',
          title: 'Sponsor & reinvestment',
          description: 'Alokasi dana mitra ke program lestari.',
          fase: '3',
          placeholder: true,
        },
        {
          id: 'kontak',
          title: 'Kanal kolaborasi',
          description: 'Profil mitra dan kontak kerja sama desa.',
          fase: '0',
          href: href(d, 'tentang'),
        },
      ],
    },
    perangkat_desa: {
      kode: 'perangkat_desa',
      tagline: 'Tata kelola & legitimasi',
      deskripsi: 'Verifikasi keanggotaan, legitimasi kebijakan desa, dan transparansi dana untuk pekon.',
      fase: 'F0–F3',
      nav: [
        { id: 'ringkasan', label: 'Ringkasan', segment: '' },
        { id: 'verifikasi', label: 'Verifikasi', segment: '/verifikasi', segera: true },
        { id: 'kebijakan', label: 'Kebijakan', segment: '/kebijakan', segera: true },
        { id: 'transparansi', label: 'Transparansi', segment: '/transparansi', segera: true },
        { id: 'kelola', label: 'Kelola operasional', segment: '/operasional' },
      ],
      stats: [
        { id: 'anggota', label: 'Keanggotaan pending', value: '—' },
        { id: 'verif', label: 'Verifikasi bulan ini', value: 0 },
        { id: 'dana', label: 'Dana konservasi', value: '—', hint: 'Fase 3' },
        { id: 'spot', label: 'Spot aktif', value: '—' },
      ],
      aksiCepat: [
        { id: 'kelola', label: 'Dashboard kelola', href: href(d, 'kelola'), primary: true },
        { id: 'dana', label: 'Laporan dana', href: href(d, 'dana-konservasi'), segera: true },
        { id: 'daya', label: 'Daya dukung', href: href(d, 'daya-dukung'), segera: true },
        { id: 'profil', label: 'Profil desa', href: href(d, 'tentang') },
      ],
      modulTerkait: [
        { label: 'Kelola desa', href: href(d, 'kelola') },
        { label: 'Dana konservasi', href: href(d, 'dana-konservasi') },
        { label: 'Neraca regeneratif', href: href(d, 'neraca-regeneratif') },
      ],
      aktivitasContoh: [
        'Menyetujui keanggotaan UMKM baru',
        'Menerbitkan laporan transparansi dana Q1',
      ],
      widgets: [
        {
          id: 'verifikasi',
          title: 'Persetujuan keanggotaan',
          description: 'Legitimasi peran UMKM, agen, dan kontributor.',
          fase: '0',
          segera: true,
        },
        {
          id: 'kelola',
          title: 'Kelola operasional',
          description: 'Dashboard pengelolaan desa dan kebijakan.',
          fase: '0',
          href: href(d, 'kelola'),
        },
        {
          id: 'dana',
          title: 'Transparansi dana',
          description: 'Aliran dana konservasi desa.',
          fase: '3',
          placeholder: true,
        },
        {
          id: 'daya-dukung',
          title: 'Daya dukung spot',
          description: 'Lampu hijau/kuning/merah per destinasi.',
          fase: '3',
          placeholder: true,
        },
        {
          id: 'laporan',
          title: 'Laporan desa',
          description: 'Ringkasan kinerja wisata regeneratif.',
          fase: '3',
          placeholder: true,
        },
      ],
    },
    admin: {
      kode: 'admin',
      tagline: 'Steward platform',
      deskripsi: 'Moderasi lintas-tenant, konfigurasi sistem, provisioning desa baru (modul Nusantara).',
      fase: 'F0–F4',
      nav: [
        { id: 'ringkasan', label: 'Ringkasan', segment: '' },
        { id: 'tenant', label: 'Tenant desa', segment: '/tenant', segera: true },
        { id: 'moderasi', label: 'Moderasi', segment: '/moderasi', segera: true },
        { id: 'sistem', label: 'Konfigurasi', segment: '/sistem', segera: true },
        { id: 'nusantara', label: 'Nusantara', segment: '/nusantara', segera: true },
      ],
      stats: [
        { id: 'desa', label: 'Desa aktif', value: '—' },
        { id: 'pengguna', label: 'Pengguna', value: '—' },
        { id: 'moderasi', label: 'Antrian moderasi', value: 0 },
        { id: 'kesehatan', label: 'Kesehatan sistem', value: 'OK' },
      ],
      aksiCepat: [
        { id: 'tenant', label: 'Provisioning desa', href: '/admin/dasbor/tenant', primary: true, segera: true },
        { id: 'discovery', label: 'Discovery global', href: '/#discovery' },
        { id: 'flagship', label: 'Teluk Kiluan', href: '/teluk-kiluan/dasbor/pokdarwis' },
      ],
      modulTerkait: [
        { label: 'Nusantara (F4)', href: '/admin/dasbor/nusantara' },
        { label: 'Health API', href: 'https://api.sigerciv.com/api/v1/sehat' },
      ],
      aktivitasContoh: [
        'Tenant baru dalam antrian onboarding',
        'Audit log RBAC lintas desa',
      ],
      widgets: [
        {
          id: 'moderasi',
          title: 'Moderasi lintas-desa',
          description: 'Antrian konten dan laporan pengguna.',
          fase: '0',
          segera: true,
        },
        {
          id: 'keanggotaan',
          title: 'Kelola peran & keanggotaan',
          description: 'RBAC dan scope per tenant.',
          fase: '0',
          segera: true,
        },
        {
          id: 'sistem',
          title: 'Konfigurasi platform',
          description: 'Parameter sistem dan integrasi.',
          fase: '0',
          segera: true,
        },
        {
          id: 'nusantara',
          title: 'Provisioning Nusantara',
          description: 'White-label dan replikasi desa mitra.',
          fase: '4',
          placeholder: true,
          href: '/admin/dasbor/nusantara',
        },
      ],
    },
  }
}
