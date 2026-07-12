const DESA = 'teluk-kiluan'

export type TNavigationFeatured = {
  title: string
  description: string
  href: string
  badge?: string
  image?: string
}

export type TNavigationItem = Partial<{
  id: string
  href: string
  name: string
  description?: string
  icon?: string
  type?: 'dropdown' | 'mega-menu'
  isNew?: boolean
  soon?: boolean
  children?: TNavigationItem[]
  featured?: TNavigationFeatured
}>

export async function getNavigation(): Promise<TNavigationItem[]> {
  return [
    {
      id: 'jelajah',
      href: '/jelajah',
      name: 'Jelajah',
      type: 'mega-menu',
      featured: {
        title: 'Laguna Kiluan',
        description: 'Spot unggulan snorkeling dari jaringan desa wisata Sigerciv.',
        href: `/${DESA}/spot/laguna-kiluan`,
        badge: 'Unggulan',
        image: '/gallery/laguna.jpg',
      },
      children: [
        {
          id: 'jelajah-kategori',
          name: 'Kategori',
          children: [
            { id: 'j-k-1', href: '/jelajah?kategori=pantai&lensa=wisata', name: 'Pantai', icon: 'sun', description: 'Pesisir & sunset' },
            { id: 'j-k-2', href: '/jelajah?kategori=snorkeling&lensa=wisata', name: 'Snorkeling', icon: 'eye', description: 'Terumbu & laguna' },
            { id: 'j-k-3', href: '/jelajah?kategori=lumba-lumba&lensa=wisata', name: 'Lumba-lumba', icon: 'sparkles', description: 'Trip pagi etis' },
            { id: 'j-k-4', href: '/jelajah?kategori=mangrove&lensa=wisata', name: 'Mangrove', icon: 'globe', description: 'Hutan bakau' },
            { id: 'j-k-5', href: '/jelajah?kategori=budaya&lensa=wisata', name: 'Budaya', icon: 'library', description: 'Tradisi nelayan' },
            { id: 'j-k-6', href: '/jelajah?kategori=kuliner&lensa=wisata', name: 'Kuliner', icon: 'shop', description: 'Cita rasa lokal' },
          ],
        },
        {
          id: 'jelajah-cara',
          name: 'Cara jelajah',
          children: [
            { id: 'j-c-1', href: `/${DESA}/peta`, name: 'Peta interaktif', icon: 'map', description: 'Lokasi & rute', soon: true },
            { id: 'j-c-2', href: '/jelajah?lensa=wisata', name: 'Spot unggulan', icon: 'star', description: 'Kurasi komunitas' },
            { id: 'j-c-3', href: '/jelajah', name: 'Destinasi terdekat', icon: 'pin', description: 'Berdasarkan lokasi' },
          ],
        },
        {
          id: 'jelajah-info',
          name: 'Informasi',
          children: [
            { id: 'j-l-1', href: `/${DESA}/panduan`, name: 'Panduan berkunjung', icon: 'book', description: 'Kode etik & tips' },
            { id: 'j-l-2', href: '/jelajah?kategori=lumba-lumba&lensa=wisata', name: 'Jadwal lumba-lumba', icon: 'clock', description: 'Pagi terbaik' },
            { id: 'j-l-3', href: `/${DESA}/berita`, name: 'Warta desa', icon: 'news', description: 'Pengumuman terbaru' },
          ],
        },
      ],
    },
    {
      id: 'pengalaman',
      href: `/${DESA}/paket`,
      name: 'Pengalaman',
      type: 'mega-menu',
      featured: {
        title: 'Paket wisata kurasi',
        description: 'Trip bahari dan pengalaman lokal — disusun agen & komunitas desa.',
        href: `/${DESA}/paket`,
        badge: 'Paket',
        image: '/gallery/pulaukelapa.jpg',
      },
      children: [
        {
          id: 'pengalaman-paket',
          name: 'Paket wisata',
          children: [
            { id: 'p-p-1', href: `/${DESA}/paket`, name: 'Semua paket', icon: 'ticket', description: 'Itinerary lengkap' },
            { id: 'p-p-2', href: `/${DESA}/paket?durasi=1-hari`, name: 'Paket sehari', icon: 'sun', description: 'Trip singkat', soon: true },
            { id: 'p-p-3', href: `/${DESA}/paket?durasi=keluarga`, name: 'Paket keluarga', icon: 'users', description: 'Ramah anak', soon: true },
          ],
        },
        {
          id: 'pengalaman-layanan',
          name: 'Layanan',
          children: [
            { id: 'p-l-1', href: `/${DESA}/pemandu`, name: 'Pemandu lokal', icon: 'user', description: 'Bersertifikat', soon: true },
            { id: 'p-l-2', href: `/${DESA}/penginapan`, name: 'Penginapan', icon: 'home', description: 'Homestay desa', soon: true },
            { id: 'p-l-3', href: `/${DESA}/sewa-alat`, name: 'Sewa peralatan', icon: 'tool', description: 'Snorkel & lainnya', soon: true },
            { id: 'p-l-4', href: `/${DESA}/transport`, name: 'Transport lokal', icon: 'truck', description: 'Antar-jemput', soon: true },
          ],
        },
        {
          id: 'pengalaman-misi',
          name: 'Misi lestari',
          children: [
            { id: 'p-m-1', href: `/${DESA}/misi`, name: 'Penjelajah Lestari', icon: 'beaker', description: 'Misi edukasi & aksi' },
            { id: 'p-m-2', href: `/${DESA}/paspor`, name: 'Paspor Lestari', icon: 'badge', description: 'Jejak dampak Anda' },
            { id: 'p-m-3', href: `/${DESA}/stasiun-lestari`, name: 'Stasiun check-in', icon: 'pin', description: 'QR geofence', soon: true },
          ],
        },
      ],
    },
    {
      id: 'pasar-desa',
      href: `/${DESA}/pasar`,
      name: 'Pasar Desa',
      type: 'mega-menu',
      featured: {
        title: 'UMKM bersertifikat',
        description: 'Dukung penyedia lokal bertingkat Tunas, Bahari, atau Lumba-Lumba.',
        href: `/${DESA}/pasar?sertifikat=lestari`,
        badge: 'Sertifikat',
      },
      children: [
        {
          id: 'pasar-kategori',
          name: 'Belanja',
          children: [
            { id: 'pd-k-1', href: `/${DESA}/pasar`, name: 'Semua UMKM', icon: 'shop', description: 'Direktori lengkap' },
            { id: 'pd-k-2', href: `/${DESA}/pasar?kategori=kuliner`, name: 'Kuliner lokal', icon: 'cube', description: 'Makanan & minuman' },
            { id: 'pd-k-3', href: `/${DESA}/pasar?kategori=kerajinan`, name: 'Kerajinan', icon: 'sparkles', description: 'Souvenir autentik' },
            { id: 'pd-k-4', href: `/${DESA}/pasar?kategori=jasa`, name: 'Jasa wisata', icon: 'ticket', description: 'Layanan komunitas' },
          ],
        },
        {
          id: 'pasar-sertifikasi',
          name: 'Naik kelas',
          children: [
            { id: 'pd-s-1', href: `/${DESA}/sertifikasi`, name: 'Tingkat Tunas', icon: 'badge', description: 'Pemula lestari' },
            { id: 'pd-s-2', href: `/${DESA}/sertifikasi`, name: 'Tingkat Bahari', icon: 'badge', description: 'Praktik baik' },
            { id: 'pd-s-3', href: `/${DESA}/sertifikasi`, name: 'Lumba-Lumba', icon: 'badge', description: 'Unggulan desa' },
          ],
        },
        {
          id: 'pasar-produk',
          name: 'Temukan',
          children: [
            { id: 'pd-p-1', href: `/${DESA}/pasar?sertifikat=lestari`, name: 'Penyedia bersertifikat', icon: 'star', description: 'Filter kualitas' },
            { id: 'pd-p-2', href: `/${DESA}/naik-kelas`, name: 'Program naik kelas', icon: 'cycle', description: 'Peningkatan UMKM' },
            { id: 'pd-p-3', href: `/${DESA}/agen`, name: 'Agen lokal', icon: 'users', description: 'Kurasi paket', soon: true },
          ],
        },
      ],
    },
    {
      id: 'cerita-dampak',
      href: `/${DESA}/tentang`,
      name: 'Cerita & Dampak',
      type: 'mega-menu',
      featured: {
        title: 'Gabung komunitas',
        description: 'Daftar sebagai wisatawan, UMKM, agen, atau pengelola Pokdarwis.',
        href: '/daftar',
        badge: 'Komunitas',
      },
      children: [
        {
          id: 'cerita-tentang',
          name: 'Tentang',
          children: [
            { id: 'cd-t-1', href: `/${DESA}/tentang`, name: 'Kisah desa', icon: 'library', description: 'Profil & sejarah' },
            { id: 'cd-w-1', href: `/${DESA}/berita`, name: 'Warta & berita', icon: 'news', description: 'Cerita komunitas' },
            { id: 'cd-t-3', href: '/', name: 'Gerbang multi-desa', icon: 'globe', description: 'Jelajah nusantara' },
          ],
        },
        {
          id: 'cerita-regeneratif',
          name: 'Regeneratif',
          children: [
            { id: 'cd-r-1', href: `/${DESA}/panduan`, name: 'Apa & mengapa', icon: 'book', description: 'Prinsip wisata' },
            { id: 'cd-r-2', href: `/${DESA}/panduan`, name: 'Etik lumba-lumba', icon: 'sparkles', description: 'Jarak & perilaku' },
            { id: 'cd-r-3', href: `/${DESA}/panduan`, name: 'Etik terumbu karang', icon: 'eye', description: 'Lindungi ekosistem' },
          ],
        },
        {
          id: 'cerita-jejak',
          name: 'Transparansi',
          children: [
            { id: 'cd-j-3', href: '/#jejak-regeneratif', name: 'Komitmen desa', icon: 'cycle', description: 'Dampak terbuka' },
            { id: 'cd-j-1', href: `/${DESA}/dana-konservasi`, name: 'Dana konservasi', icon: 'money', description: 'Alokasi dana', soon: true },
            { id: 'cd-j-2', href: `/${DESA}/neraca-regeneratif`, name: 'Neraca regeneratif', icon: 'beaker', description: 'Laporan dampak', soon: true },
          ],
        },
        {
          id: 'cerita-gabung',
          name: 'Gabung',
          children: [
            { id: 'cd-g-1', href: '/daftar?peran=wisatawan', name: 'Wisatawan', icon: 'user', description: 'Jelajah & kontribusi' },
            { id: 'cd-g-2', href: '/daftar?peran=umkm', name: 'UMKM', icon: 'shop', description: 'Jual produk & jasa' },
            { id: 'cd-g-3', href: '/daftar?peran=agen', name: 'Agen lokal', icon: 'map', description: 'Kurasi paket' },
            { id: 'cd-g-4', href: '/daftar?peran=pokdarwis', name: 'Pokdarwis', icon: 'users', description: 'Kelola desa' },
          ],
        },
      ],
    },
  ]
}

export async function getNavMegaMenu(): Promise<TNavigationItem> {
  const navigation = await getNavigation()
  return navigation[0] || {}
}

/** Tautan footer — sinkron dengan menu utama. */
export async function getFooterLinks(): Promise<{ href: string; label: string }[]> {
  return [
    { href: `/${DESA}/berita`, label: 'Warta & Berita' },
    { href: `/${DESA}/tentang`, label: 'Tentang desa' },
    { href: `/${DESA}/panduan`, label: 'Panduan berkunjung' },
    { href: `/${DESA}/pasar`, label: 'Pasar Desa' },
  ]
}

export const getLanguages = async () => {
  return [
    {
      id: 'Indonesia',
      name: 'Bahasa Indonesia',
      description: 'Indonesia',
      href: '#',
      active: true,
    },
    {
      id: 'English',
      name: 'English',
      description: 'United States',
      href: '#',
    },
  ]
}

export const getCurrencies = async () => {
  return [
    {
      id: 'IDR',
      name: 'IDR',
      href: '#',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="currentColor" fill="none">
    <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="1.5"></path>
    <path d="M9 12H13.2M9 12V9.2963C9 8.82489 9 8.58919 9.14645 8.44274C9.29289 8.2963 9.5286 8.2963 10 8.2963H13.2C14.1941 8.2963 15 9.1254 15 10.1481C15 11.1709 14.1941 12 13.2 12M9 12V14.7037C9 15.1751 9 15.4108 9.14645 15.5572C9.29289 15.7037 9.5286 15.7037 10 15.7037H13.2C14.1941 15.7037 15 14.8746 15 13.8518C15 12.8291 14.1941 12 13.2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
</svg>`,
      active: true,
    },
  ]
}

export const getHeaderDropdownCategories = async () => {
  return []
}
