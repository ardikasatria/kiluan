export type ModulFase = 'F0' | 'F1' | 'F2' | 'F3' | 'F4'

export interface ModulPlaceholderConfig {
  /** slug URL, mis. `pasar` → /[desa]/pasar */
  slug: string
  judul: string
  modulLabel: string
  fase: ModulFase
  deskripsi: string
  fiturRencana: string[]
  /** true = halaman sudah punya implementasi penuh (bukan placeholder) */
  aktif?: boolean
}

export const MODUL_PLACEHOLDER: Record<string, ModulPlaceholderConfig> = {
  pasar: {
    slug: 'pasar',
    judul: 'Pasar Desa',
    modulLabel: 'Kolaborasi Ekosistem',
    fase: 'F1',
    aktif: true,
    deskripsi:
      'UMKM mendaftarkan produk dan jasa wisata secara mandiri. Transaksi langsung ke penyedia lokal — tanpa komisi agregator pusat.',
    fiturRencana: [
      'Katalog UMKM terverifikasi per desa',
      'Produk & jasa dengan harga lokal',
      'Boost ranking untuk UMKM bersertifikat Naik Kelas Lestari',
      'Dashboard performa untuk pelaku usaha',
    ],
  },
  paket: {
    slug: 'paket',
    judul: 'Paket Wisata',
    modulLabel: 'Kurasi Konten & Paket',
    fase: 'F1',
    deskripsi:
      'Agen lokal menyusun itinerary, kuota, dan harga paket wisata dengan alur kurasi Pokdarwis (draft → review → publikasi).',
    fiturRencana: [
      'Editor paket dengan item itinerary',
      'State machine status paket',
      'Kuota & jadwal keberangkatan',
      'Integrasi booking di Fase 2 (Dermaga)',
    ],
  },
  agen: {
    slug: 'agen',
    judul: 'Agen Lokal',
    modulLabel: 'Pasar Desa',
    fase: 'F1',
    deskripsi: 'Direktori penyusun paket wisata dan pemandu bersertifikat di desa.',
    fiturRencana: [
      'Profil agen & portofolio paket',
      'Verifikasi peran oleh Pokdarwis',
      'Kontak langsung ke wisatawan',
    ],
  },
  kontribusi: {
    slug: 'kontribusi',
    judul: 'Kontribusi Data',
    modulLabel: 'Gamifikasi Kontribusi',
    fase: 'F1',
    aktif: true,
    deskripsi:
      'Warga dan wisatawan menyumbang foto, tips, atau koreksi data destinasi. Konten melalui antrian kurasi sebelum tampil publik.',
    fiturRencana: [
      'Form kontribusi foto & koreksi',
      'Antrian kurasi Pokdarwis',
      'Poin & badge untuk kontributor',
    ],
  },
  lencana: {
    slug: 'lencana',
    judul: 'Lencana Warga',
    modulLabel: 'Gamifikasi Kontribusi',
    fase: 'F1',
    aktif: true,
    deskripsi: 'Badge tiga tingkat dan progres partisipasi komunitas di platform sigerciv.',
    fiturRencana: [
      'Koleksi lencana per pengguna',
      'Aturan poin otomatis & idempoten',
      'Badge "Warga Perintis" untuk early adopter PWA',
    ],
  },
  leaderboard: {
    slug: 'leaderboard',
    judul: 'Leaderboard Kontributor',
    modulLabel: 'Gamifikasi Kontribusi',
    fase: 'F1',
    aktif: true,
    deskripsi: 'Peringkat kontributor data dan partisipasi regeneratif per desa.',
    fiturRencana: ['Peringkat bulanan & sepanjang masa', 'Filter per kategori kontribusi'],
  },
  peta: {
    slug: 'peta',
    judul: 'Peta Destinasi',
    modulLabel: 'Gerbang',
    fase: 'F0',
    deskripsi:
      'Peta interaktif seluruh spot publik desa. Sementara gunakan peta di etalase desa atau discovery multi-desa.',
    fiturRencana: [
      'Peta full-screen per desa',
      'Filter kategori & cluster marker',
      'Integrasi geo radius "dekat saya"',
    ],
  },
  kalender: {
    slug: 'kalender',
    judul: 'Kalender Aktivitas',
    modulLabel: 'Destinasi sigerciv',
    fase: 'F0',
    deskripsi:
      'Jadwal event musiman — misalnya lumba-lumba pagi, festival, atau musim angin tertentu. Pengelola dapat mengatur kalender di dashboard.',
    fiturRencana: [
      'Tampilan kalender publik',
      'Event terkait destinasi',
      'Sinkronisasi dengan data kelola/kalender',
    ],
  },
  misi: {
    slug: 'misi',
    judul: 'Penjelajah Lestari',
    modulLabel: 'Misi sigerciv',
    fase: 'F2',
    deskripsi:
      'Quest wisatawan: micro-lesson kode etik bahari, lalu aksi terverifikasi (tanam mangrove, bersih pantai, monitoring lumba-lumba).',
    fiturRencana: [
      'Katalog misi per desa',
      'Micro-lesson wajib sebelum quest',
      'Verifikasi QR di Stasiun Lestari',
      'Reward ke Paspor Lestari',
    ],
  },
  'stasiun-lestari': {
    slug: 'stasiun-lestari',
    judul: 'Stasiun Lestari',
    modulLabel: 'Misi sigerciv',
    fase: 'F2',
    deskripsi:
      'Titik check-in QR di dermaga lumba-lumba, mangrove, dan spot konservasi — bukti kehadiran aksi regeneratif.',
    fiturRencana: [
      'QR geotag per stasiun',
      'Konfirmasi pemandu/Pokdarwis',
      'Log verifikasi terhubung ke misi',
    ],
  },
  'naik-kelas': {
    slug: 'naik-kelas',
    judul: 'Naik Kelas Lestari',
    modulLabel: 'Misi sigerciv',
    fase: 'F1',
    aktif: true,
    deskripsi:
      'Sertifikasi bertingkat owner UMKM/agen: Tunas → Bahari → Lumba-Lumba melalui kartu aksi regeneratif tervalidasi.',
    fiturRencana: [
      'Dashboard progres owner',
      'Tingkat & badge di listing Pasar Desa',
      'Boost ranking untuk praktik lestari',
    ],
  },
  'kartu-aksi': {
    slug: 'kartu-aksi',
    judul: 'Kartu Aksi',
    modulLabel: 'Misi sigerciv',
    fase: 'F1',
    deskripsi:
      'Praktik konkret dengan bukti: tanpa plastik sekali pakai, bahan lokal, kelola limbah, sisihkan % ke dana konservasi.',
    fiturRencana: [
      'Daftar kartu aksi per kategori',
      'Pengajuan & verifikasi bukti',
      'Modul edukasi "kenapa ini penting"',
    ],
  },
  sertifikasi: {
    slug: 'sertifikasi',
    judul: 'Tingkat Sertifikasi',
    modulLabel: 'Misi sigerciv',
    fase: 'F1',
    aktif: true,
    deskripsi: 'Ringkasan tingkat sertifikasi regeneratif yang dimiliki penyedia di desa.',
    fiturRencana: ['Publik: badge di profil UMKM', 'Transparansi kartu tervalidasi'],
  },
  'dana-konservasi': {
    slug: 'dana-konservasi',
    judul: 'Dana Konservasi',
    modulLabel: 'Jejak Lestari',
    fase: 'F3',
    deskripsi:
      'Akumulasi porsi reinvestment dari transaksi dan laporan penggunaan transparan untuk komunitas & perangkat desa.',
    fiturRencana: [
      'Saldo & riwayat porsi reinvestment',
      'Laporan penggunaan dana publik',
      'Hook transaksi dari modul Dermaga (F2)',
    ],
  },
  'neraca-regeneratif': {
    slug: 'neraca-regeneratif',
    judul: 'Neraca Regeneratif',
    modulLabel: 'Jejak Lestari',
    fase: 'F3',
    deskripsi:
      'Skor gabungan dampak ekologi-sosial-ekonomi — KPI setara GMV untuk pariwisata regeneratif yang terukur.',
    fiturRencana: [
      'Indikator ekologi, sosial, ekonomi',
      'Feed dari monitoring warga & transaksi',
      'Dashboard publik transparansi',
    ],
  },
  'daya-dukung': {
    slug: 'daya-dukung',
    judul: 'Daya Dukung Spot',
    modulLabel: 'Jejak Lestari',
    fase: 'F3',
    deskripsi:
      'Kapasitas harian per spot vs kunjungan aktual — peringatan over-capacity untuk ekowisata bertanggung jawab.',
    fiturRencana: [
      'Lampu hijau/kuning/merah per destinasi',
      'Alarm saat mendekati batas kuota',
      'Data daya_dukung_harian dari F0',
    ],
  },
  monitoring: {
    slug: 'monitoring',
    judul: 'Monitoring Ekologi',
    modulLabel: 'Jejak Lestari',
    fase: 'F3',
    deskripsi:
      'Form lapangan offline-first: survival mangrove, kesehatan karang, sampah terkumpul — diverifikasi warga & perangkat desa.',
    fiturRencana: [
      'Entri data PWA tanpa sinyal',
      'Sinkronisasi tertunda',
      'Validasi klaim dampak (anti greenwashing)',
    ],
  },
}

/** Modul di root (tanpa prefix desa) */
export const MODUL_ROOT: Record<string, ModulPlaceholderConfig> = {
  paspor: {
    slug: 'paspor',
    judul: 'Paspor Lestari',
    modulLabel: 'Misi sigerciv',
    fase: 'F2',
    deskripsi:
      'Impact passport pribadi wisatawan — stempel misi, ringkasan dampak ("kamu bantu tanam 5 mangrove"), badge & sertifikat digital.',
    fiturRencana: [
      'Koleksi stempel per misi selesai',
      'Ringkasan dampak pribadi',
      'Diskon dari UMKM bersertifikat',
      'Perlu masuk akun wisatawan',
    ],
  },
}

export function ambilModul(slug: string): ModulPlaceholderConfig | null {
  return MODUL_PLACEHOLDER[slug] ?? MODUL_ROOT[slug] ?? null
}

export const SLUG_MODUL_DESA = Object.keys(MODUL_PLACEHOLDER)
