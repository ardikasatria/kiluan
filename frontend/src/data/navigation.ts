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
      href: `/${DESA}`,
      name: 'Jelajah',
      type: 'mega-menu',
      description: 'Destinasi & tempat wisata',
      featured: {
        title: 'Laguna Kiluan',
        description: 'Spot unggulan untuk snorkeling di perairan tenang Teluk Kiluan.',
        href: `/${DESA}/spot/laguna-kiluan`,
        badge: 'Spot unggulan',
        image: '/gallery/laguna.jpg',
      },
      children: [
        {
          id: 'jelajah-kategori',
          name: 'Kategori',
          children: [
            { id: 'j-k-1', href: `/${DESA}?kategori=pantai#destinasi`, name: 'Pantai' },
            { id: 'j-k-2', href: `/${DESA}?kategori=snorkeling#destinasi`, name: 'Snorkeling' },
            { id: 'j-k-3', href: `/${DESA}?kategori=lumba-lumba#destinasi`, name: 'Lumba-lumba' },
            { id: 'j-k-4', href: `/${DESA}?kategori=mangrove#destinasi`, name: 'Mangrove' },
            { id: 'j-k-5', href: `/${DESA}?kategori=budaya#destinasi`, name: 'Budaya' },
            { id: 'j-k-6', href: `/${DESA}?kategori=kuliner#destinasi`, name: 'Kuliner' },
          ],
        },
        {
          id: 'jelajah-cara',
          name: 'Cara jelajah',
          children: [
            { id: 'j-c-1', href: `/${DESA}/peta`, name: 'Peta' },
            { id: 'j-c-2', href: '/#spot-unggulan', name: 'Spot unggulan' },
            { id: 'j-c-3', href: '/cari', name: 'Terdekat' },
          ],
        },
        {
          id: 'jelajah-kalender',
          name: 'Kalender',
          children: [
            { id: 'j-l-1', href: `/${DESA}/kalender`, name: 'Aktivitas musiman' },
            { id: 'j-l-2', href: `/${DESA}?kategori=lumba-lumba#destinasi`, name: 'Jadwal lumba-lumba pagi' },
            { id: 'j-l-3', href: `/${DESA}/panduan`, name: 'Panduan berkunjung' },
          ],
        },
      ],
    },
    {
      id: 'pengalaman',
      href: `/${DESA}/paket`,
      name: 'Pengalaman',
      type: 'mega-menu',
      description: 'Paket, layanan, dan misi lestari',
      featured: {
        title: 'Paket wisata kurasi',
        description: 'Trip bahari dan pengalaman lokal — kurasi komunitas desa.',
        href: `/${DESA}/paket`,
        badge: 'Pengalaman',
      },
      children: [
        {
          id: 'pengalaman-paket',
          name: 'Paket wisata',
          children: [
            { id: 'p-p-1', href: `/${DESA}/paket`, name: 'Semua paket' },
            { id: 'p-p-2', href: `/${DESA}/paket?durasi=1-hari`, name: 'Paket sehari', soon: true },
            { id: 'p-p-3', href: `/${DESA}/paket?durasi=keluarga`, name: 'Paket keluarga', soon: true },
          ],
        },
        {
          id: 'pengalaman-layanan',
          name: 'Layanan',
          children: [
            { id: 'p-l-1', href: `/${DESA}/pemandu`, name: 'Pemandu', soon: true },
            { id: 'p-l-2', href: `/${DESA}/penginapan`, name: 'Penginapan', soon: true },
            { id: 'p-l-3', href: `/${DESA}/sewa-alat`, name: 'Sewa alat', soon: true },
            { id: 'p-l-4', href: `/${DESA}/transport`, name: 'Transport', soon: true },
            { id: 'p-l-5', href: `/${DESA}/pasar?kategori=kuliner`, name: 'Kuliner' },
            { id: 'p-l-6', href: `/${DESA}/tiket`, name: 'Tiket', soon: true },
          ],
        },
        {
          id: 'pengalaman-misi',
          name: 'Misi Lestari',
          children: [
            { id: 'p-m-1', href: `/${DESA}/misi`, name: 'Penjelajah Lestari' },
            { id: 'p-m-2', href: '/paspor', name: 'Paspor Lestari' },
            { id: 'p-m-3', href: `/${DESA}/stasiun-lestari`, name: 'Stasiun Lestari', soon: true },
          ],
        },
      ],
    },
    {
      id: 'pasar-desa',
      href: `/${DESA}/pasar`,
      name: 'Pasar Desa',
      type: 'mega-menu',
      description: 'UMKM & produk lokal bersertifikat',
      featured: {
        title: 'UMKM bersertifikat',
        description: 'Penyedia lokal dengan tingkat Tunas, Bahari, atau Lumba-Lumba.',
        href: `/${DESA}/pasar?sertifikat=lestari`,
        badge: 'Owner bersertifikat',
      },
      children: [
        {
          id: 'pasar-kategori',
          name: 'Kategori UMKM',
          children: [
            { id: 'pd-k-1', href: `/${DESA}/pasar`, name: 'Semua UMKM' },
            { id: 'pd-k-2', href: `/${DESA}/pasar?kategori=kuliner`, name: 'Kuliner lokal' },
            { id: 'pd-k-3', href: `/${DESA}/pasar?kategori=kerajinan`, name: 'Kerajinan & souvenir' },
            { id: 'pd-k-4', href: `/${DESA}/pasar?kategori=jasa`, name: 'Jasa wisata' },
          ],
        },
        {
          id: 'pasar-sertifikasi',
          name: 'Owner bersertifikat',
          children: [
            { id: 'pd-s-1', href: `/${DESA}/sertifikasi`, name: 'Tingkat Tunas' },
            { id: 'pd-s-2', href: `/${DESA}/sertifikasi`, name: 'Tingkat Bahari' },
            { id: 'pd-s-3', href: `/${DESA}/sertifikasi`, name: 'Tingkat Lumba-Lumba' },
          ],
        },
        {
          id: 'pasar-produk',
          name: 'Produk & jasa',
          children: [
            { id: 'pd-p-1', href: `/${DESA}/pasar`, name: 'Katalog produk' },
            { id: 'pd-p-2', href: `/${DESA}/pasar?sertifikat=lestari`, name: 'Penyedia bersertifikat' },
            { id: 'pd-p-3', href: `/${DESA}/agen`, name: 'Agen lokal', soon: true },
          ],
        },
      ],
    },
    {
      id: 'cerita-dampak',
      href: `/${DESA}/tentang`,
      name: 'Cerita & Dampak',
      type: 'mega-menu',
      description: 'Komunitas, regeneratif, dan gabung',
      featured: {
        title: 'Gabung komunitas sigerciv',
        description: 'Daftar sebagai warga, UMKM, agen, atau pengelola Pokdarwis.',
        href: '/daftar',
        badge: 'Gabung',
      },
      children: [
        {
          id: 'cerita-tentang',
          name: 'Tentang sigerciv',
          children: [
            { id: 'cd-t-1', href: `/${DESA}/tentang`, name: 'Kisah desa' },
            { id: 'cd-t-2', href: `/${DESA}/tentang`, name: 'Kepemilikan komunitas' },
            { id: 'cd-t-3', href: '/', name: 'Gerbang multi-desa' },
            { id: 'cd-w-1', href: `/${DESA}/berita`, name: 'Warta & Berita' },
          ],
        },
        {
          id: 'cerita-regeneratif',
          name: 'Wisata Regeneratif',
          children: [
            { id: 'cd-r-1', href: `/${DESA}/panduan`, name: 'Apa & mengapa' },
            { id: 'cd-r-2', href: `/${DESA}/panduan`, name: 'Kode etik lumba-lumba' },
            { id: 'cd-r-3', href: `/${DESA}/panduan`, name: 'Kode etik karang' },
          ],
        },
        {
          id: 'cerita-jejak',
          name: 'Jejak Konservasi',
          children: [
            { id: 'cd-j-1', href: `/${DESA}/dana-konservasi`, name: 'Dana konservasi', soon: true },
            { id: 'cd-j-2', href: `/${DESA}/neraca-regeneratif`, name: 'Neraca regeneratif', soon: true },
            { id: 'cd-j-3', href: '/#jejak-regeneratif', name: 'Komitmen transparansi' },
          ],
        },
        {
          id: 'cerita-gabung',
          name: 'Gabung Komunitas',
          children: [
            { id: 'cd-g-1', href: '/daftar?peran=wisatawan', name: 'Warga / Wisatawan' },
            { id: 'cd-g-2', href: '/daftar?peran=umkm', name: 'UMKM' },
            { id: 'cd-g-3', href: '/daftar?peran=agen', name: 'Agen' },
            { id: 'cd-g-4', href: '/daftar?peran=pokdarwis', name: 'Pokdarwis' },
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
