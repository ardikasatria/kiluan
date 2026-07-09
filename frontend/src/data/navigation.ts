const DESA = 'teluk-kiluan'

export async function getNavigation(): Promise<TNavigationItem[]> {
  return [
    {
      id: 'jelajahi',
      href: `/${DESA}`,
      name: 'Jelajahi',
      type: 'mega-menu',
      description: 'Gerbang & Destinasi sigerciv',
      children: [
        {
          id: 'jelajahi-destinasi',
          name: 'Destinasi',
          children: [
            { id: 'j-d-1', href: `/${DESA}`, name: 'Beranda Desa' },
            { id: 'j-d-2', href: `/${DESA}#destinasi`, name: 'Katalog Spot' },
            { id: 'j-d-3', href: `/${DESA}/peta`, name: 'Peta Destinasi' },
            { id: 'j-d-4', href: '/cari', name: 'Cari Sekitar Saya' },
          ],
        },
        {
          id: 'jelajahi-pengalaman',
          name: 'Pengalaman',
          children: [
            { id: 'j-p-1', href: `/${DESA}/destinasi?kategori=lumba-lumba`, name: 'Lumba-lumba Pagi' },
            { id: 'j-p-2', href: `/${DESA}/destinasi?kategori=snorkeling`, name: 'Snorkeling & Karang' },
            { id: 'j-p-3', href: `/${DESA}/destinasi?kategori=tracking`, name: 'Tracking Hutan' },
            { id: 'j-p-4', href: `/${DESA}/destinasi?kategori=pantai`, name: 'Pantai & Teluk' },
          ],
        },
        {
          id: 'jelajahi-info',
          name: 'Informasi',
          children: [
            { id: 'j-i-1', href: `/${DESA}/kalender`, name: 'Kalender Aktivitas' },
            { id: 'j-i-2', href: `/${DESA}/panduan`, name: 'Panduan Berkunjung' },
            { id: 'j-i-3', href: `/${DESA}/tentang`, name: 'Profil Desa' },
            { id: 'j-i-4', href: '/', name: 'Discovery Multi-Desa' },
          ],
        },
      ],
    },
    {
      id: 'komunitas',
      href: `/${DESA}/pasar`,
      name: 'Komunitas',
      type: 'mega-menu',
      description: 'Pasar Desa & Kolaborasi',
      children: [
        {
          id: 'komunitas-umkm',
          name: 'Pasar Desa',
          children: [
            { id: 'k-u-1', href: `/${DESA}/pasar`, name: 'Semua UMKM' },
            { id: 'k-u-2', href: `/${DESA}/pasar?kategori=kuliner`, name: 'Kuliner Lokal' },
            { id: 'k-u-3', href: `/${DESA}/pasar?kategori=kerajinan`, name: 'Kerajinan & Souvenir' },
            { id: 'k-u-4', href: `/${DESA}/pasar?kategori=jasa`, name: 'Jasa Wisata' },
          ],
        },
        {
          id: 'komunitas-paket',
          name: 'Paket Wisata',
          children: [
            { id: 'k-p-1', href: `/${DESA}/paket`, name: 'Semua Paket' },
            { id: 'k-p-2', href: `/${DESA}/paket?durasi=1-hari`, name: 'Paket Sehari' },
            { id: 'k-p-3', href: `/${DESA}/paket?durasi=keluarga`, name: 'Paket Keluarga' },
            { id: 'k-p-4', href: `/${DESA}/agen`, name: 'Agen Lokal' },
          ],
        },
        {
          id: 'komunitas-kolaborasi',
          name: 'Kolaborasi',
          children: [
            { id: 'k-k-1', href: `/${DESA}/kontribusi`, name: 'Kontribusi Data' },
            { id: 'k-k-2', href: `/${DESA}/saya/lencana`, name: 'Lencana Warga' },
            { id: 'k-k-3', href: `/${DESA}/leaderboard`, name: 'Leaderboard' },
            { id: 'k-k-4', href: `/${DESA}/pasar?sertifikat=lestari`, name: 'UMKM Bersertifikat' },
          ],
        },
      ],
    },
    {
      id: 'lestari',
      href: `/${DESA}/misi`,
      name: 'Lestari',
      type: 'mega-menu',
      isNew: true,
      description: 'Misi sigerciv & Jejak Lestari',
      children: [
        {
          id: 'lestari-wisatawan',
          name: 'Misi Wisatawan',
          children: [
            { id: 'l-w-1', href: `/${DESA}/misi`, name: 'Penjelajah Lestari' },
            { id: 'l-w-2', href: `/${DESA}/paspor`, name: 'Paspor Lestari' },
            { id: 'l-w-3', href: `/${DESA}/stasiun-lestari`, name: 'Stasiun Lestari' },
            { id: 'l-w-4', href: `/${DESA}/misi?status=aktif`, name: 'Quest Aktif' },
          ],
        },
        {
          id: 'lestari-owner',
          name: 'Praktik Regeneratif',
          children: [
            { id: 'l-o-1', href: `/${DESA}/naik-kelas`, name: 'Naik Kelas Lestari' },
            { id: 'l-o-2', href: `/${DESA}/kartu-aksi`, name: 'Kartu Aksi' },
            { id: 'l-o-3', href: `/${DESA}/kelola`, name: 'Dashboard Pengelola' },
            { id: 'l-o-4', href: `/${DESA}/sertifikasi`, name: 'Tingkat Sertifikasi' },
          ],
        },
        {
          id: 'lestari-transparansi',
          name: 'Transparansi',
          children: [
            { id: 'l-t-1', href: `/${DESA}/dana-konservasi`, name: 'Dana Konservasi' },
            { id: 'l-t-2', href: `/${DESA}/neraca-regeneratif`, name: 'Neraca Regeneratif' },
            { id: 'l-t-3', href: `/${DESA}/daya-dukung`, name: 'Daya Dukung Spot' },
            { id: 'l-t-4', href: `/${DESA}/monitoring`, name: 'Monitoring Ekologi' },
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

export type TNavigationItem = Partial<{
  id: string
  href: string
  name: string
  description?: string
  type?: 'dropdown' | 'mega-menu'
  isNew?: boolean
  children?: TNavigationItem[]
}>

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
