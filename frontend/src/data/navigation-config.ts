import type { Locale } from '@/i18n/routing'
import { withLocale } from '@/lib/i18n/locale-path'

const DESA = 'teluk-kiluan'

export type NavItemDef = {
  id: string
  href: string
  nameKey: string
  descriptionKey?: string
  icon?: string
  soon?: boolean
  children?: NavItemDef[]
}

export type NavMenuDef = {
  id: string
  href: string
  nameKey: string
  type: 'mega-menu'
  featured: {
    titleKey: string
    descriptionKey: string
    href: string
    badgeKey?: string
    image?: string
  }
  children: NavItemDef[]
}

export const NAV_MENUS: NavMenuDef[] = [
  {
    id: 'jelajah',
    href: '/jelajah',
    nameKey: 'menu.jelajah.name',
    type: 'mega-menu',
    featured: {
      titleKey: 'featured.jelajah.title',
      descriptionKey: 'featured.jelajah.description',
      href: `/${DESA}/spot/laguna-kiluan`,
      badgeKey: 'badge.featured',
      image: '/gallery/laguna.jpg',
    },
    children: [
      {
        id: 'jelajah-kategori',
        href: '#',
        nameKey: 'section.jelajah-kategori.name',
        children: [
          { id: 'j-k-1', href: '/jelajah?kategori=pantai&lensa=wisata', nameKey: 'item.j-k-1.name', descriptionKey: 'item.j-k-1.description', icon: 'sun' },
          { id: 'j-k-2', href: '/jelajah?kategori=snorkeling&lensa=wisata', nameKey: 'item.j-k-2.name', descriptionKey: 'item.j-k-2.description', icon: 'eye' },
          { id: 'j-k-3', href: '/jelajah?kategori=lumba-lumba&lensa=wisata', nameKey: 'item.j-k-3.name', descriptionKey: 'item.j-k-3.description', icon: 'sparkles' },
          { id: 'j-k-4', href: '/jelajah?kategori=mangrove&lensa=wisata', nameKey: 'item.j-k-4.name', descriptionKey: 'item.j-k-4.description', icon: 'globe' },
          { id: 'j-k-5', href: '/jelajah?kategori=budaya&lensa=wisata', nameKey: 'item.j-k-5.name', descriptionKey: 'item.j-k-5.description', icon: 'library' },
          { id: 'j-k-6', href: '/jelajah?kategori=kuliner&lensa=wisata', nameKey: 'item.j-k-6.name', descriptionKey: 'item.j-k-6.description', icon: 'shop' },
        ],
      },
      {
        id: 'jelajah-cara',
        href: '#',
        nameKey: 'section.jelajah-cara.name',
        children: [
          { id: 'j-c-1', href: `/${DESA}/peta`, nameKey: 'item.j-c-1.name', descriptionKey: 'item.j-c-1.description', icon: 'map', soon: true },
          { id: 'j-c-2', href: '/jelajah?lensa=wisata', nameKey: 'item.j-c-2.name', descriptionKey: 'item.j-c-2.description', icon: 'star' },
          { id: 'j-c-3', href: '/jelajah', nameKey: 'item.j-c-3.name', descriptionKey: 'item.j-c-3.description', icon: 'pin' },
        ],
      },
      {
        id: 'jelajah-info',
        href: '#',
        nameKey: 'section.jelajah-info.name',
        children: [
          { id: 'j-l-1', href: `/${DESA}/panduan`, nameKey: 'item.j-l-1.name', descriptionKey: 'item.j-l-1.description', icon: 'book' },
          { id: 'j-l-2', href: '/jelajah?kategori=lumba-lumba&lensa=wisata', nameKey: 'item.j-l-2.name', descriptionKey: 'item.j-l-2.description', icon: 'clock' },
          { id: 'j-l-3', href: `/${DESA}/berita`, nameKey: 'item.j-l-3.name', descriptionKey: 'item.j-l-3.description', icon: 'news' },
        ],
      },
    ],
  },
  {
    id: 'pengalaman',
    href: `/${DESA}/paket`,
    nameKey: 'menu.pengalaman.name',
    type: 'mega-menu',
    featured: {
      titleKey: 'featured.pengalaman.title',
      descriptionKey: 'featured.pengalaman.description',
      href: `/${DESA}/paket`,
      badgeKey: 'badge.package',
      image: '/gallery/pulaukelapa.jpg',
    },
    children: [
      {
        id: 'pengalaman-paket',
        href: '#',
        nameKey: 'section.pengalaman-paket.name',
        children: [
          { id: 'p-p-1', href: `/${DESA}/paket`, nameKey: 'item.p-p-1.name', descriptionKey: 'item.p-p-1.description', icon: 'ticket' },
          { id: 'p-p-2', href: `/${DESA}/paket?durasi=1-hari`, nameKey: 'item.p-p-2.name', descriptionKey: 'item.p-p-2.description', icon: 'sun', soon: true },
          { id: 'p-p-3', href: `/${DESA}/paket?durasi=keluarga`, nameKey: 'item.p-p-3.name', descriptionKey: 'item.p-p-3.description', icon: 'users', soon: true },
        ],
      },
      {
        id: 'pengalaman-layanan',
        href: '#',
        nameKey: 'section.pengalaman-layanan.name',
        children: [
          { id: 'p-l-1', href: `/${DESA}/pemandu`, nameKey: 'item.p-l-1.name', descriptionKey: 'item.p-l-1.description', icon: 'user', soon: true },
          { id: 'p-l-2', href: `/${DESA}/penginapan`, nameKey: 'item.p-l-2.name', descriptionKey: 'item.p-l-2.description', icon: 'home', soon: true },
          { id: 'p-l-3', href: `/${DESA}/sewa-alat`, nameKey: 'item.p-l-3.name', descriptionKey: 'item.p-l-3.description', icon: 'tool', soon: true },
          { id: 'p-l-4', href: `/${DESA}/transport`, nameKey: 'item.p-l-4.name', descriptionKey: 'item.p-l-4.description', icon: 'truck', soon: true },
        ],
      },
      {
        id: 'pengalaman-misi',
        href: '#',
        nameKey: 'section.pengalaman-misi.name',
        children: [
          { id: 'p-m-1', href: `/${DESA}/misi`, nameKey: 'item.p-m-1.name', descriptionKey: 'item.p-m-1.description', icon: 'beaker' },
          { id: 'p-m-2', href: `/${DESA}/paspor`, nameKey: 'item.p-m-2.name', descriptionKey: 'item.p-m-2.description', icon: 'badge' },
          { id: 'p-m-3', href: `/${DESA}/stasiun-lestari`, nameKey: 'item.p-m-3.name', descriptionKey: 'item.p-m-3.description', icon: 'pin', soon: true },
        ],
      },
    ],
  },
  {
    id: 'pasar-desa',
    href: `/${DESA}/pasar`,
    nameKey: 'menu.pasar-desa.name',
    type: 'mega-menu',
    featured: {
      titleKey: 'featured.pasar-desa.title',
      descriptionKey: 'featured.pasar-desa.description',
      href: `/${DESA}/pasar?sertifikat=lestari`,
      badgeKey: 'badge.certified',
    },
    children: [
      {
        id: 'pasar-kategori',
        href: '#',
        nameKey: 'section.pasar-kategori.name',
        children: [
          { id: 'pd-k-1', href: `/${DESA}/pasar`, nameKey: 'item.pd-k-1.name', descriptionKey: 'item.pd-k-1.description', icon: 'shop' },
          { id: 'pd-k-2', href: `/${DESA}/pasar?kategori=kuliner`, nameKey: 'item.pd-k-2.name', descriptionKey: 'item.pd-k-2.description', icon: 'cube' },
          { id: 'pd-k-3', href: `/${DESA}/pasar?kategori=kerajinan`, nameKey: 'item.pd-k-3.name', descriptionKey: 'item.pd-k-3.description', icon: 'sparkles' },
          { id: 'pd-k-4', href: `/${DESA}/pasar?kategori=jasa`, nameKey: 'item.pd-k-4.name', descriptionKey: 'item.pd-k-4.description', icon: 'ticket' },
        ],
      },
      {
        id: 'pasar-sertifikasi',
        href: '#',
        nameKey: 'section.pasar-sertifikasi.name',
        children: [
          { id: 'pd-s-1', href: `/${DESA}/sertifikasi`, nameKey: 'item.pd-s-1.name', descriptionKey: 'item.pd-s-1.description', icon: 'badge' },
          { id: 'pd-s-2', href: `/${DESA}/sertifikasi`, nameKey: 'item.pd-s-2.name', descriptionKey: 'item.pd-s-2.description', icon: 'badge' },
          { id: 'pd-s-3', href: `/${DESA}/sertifikasi`, nameKey: 'item.pd-s-3.name', descriptionKey: 'item.pd-s-3.description', icon: 'badge' },
        ],
      },
      {
        id: 'pasar-produk',
        href: '#',
        nameKey: 'section.pasar-produk.name',
        children: [
          { id: 'pd-p-1', href: `/${DESA}/pasar?sertifikat=lestari`, nameKey: 'item.pd-p-1.name', descriptionKey: 'item.pd-p-1.description', icon: 'star' },
          { id: 'pd-p-2', href: `/${DESA}/naik-kelas`, nameKey: 'item.pd-p-2.name', descriptionKey: 'item.pd-p-2.description', icon: 'cycle' },
          { id: 'pd-p-3', href: `/${DESA}/agen`, nameKey: 'item.pd-p-3.name', descriptionKey: 'item.pd-p-3.description', icon: 'users', soon: true },
        ],
      },
    ],
  },
  {
    id: 'cerita-dampak',
    href: `/${DESA}/tentang`,
    nameKey: 'menu.cerita-dampak.name',
    type: 'mega-menu',
    featured: {
      titleKey: 'featured.cerita-dampak.title',
      descriptionKey: 'featured.cerita-dampak.description',
      href: '/daftar',
      badgeKey: 'badge.community',
    },
    children: [
      {
        id: 'cerita-tentang',
        href: '#',
        nameKey: 'section.cerita-tentang.name',
        children: [
          { id: 'cd-t-1', href: `/${DESA}/tentang`, nameKey: 'item.cd-t-1.name', descriptionKey: 'item.cd-t-1.description', icon: 'library' },
          { id: 'cd-w-1', href: `/${DESA}/berita`, nameKey: 'item.cd-w-1.name', descriptionKey: 'item.cd-w-1.description', icon: 'news' },
          { id: 'cd-t-3', href: '/', nameKey: 'item.cd-t-3.name', descriptionKey: 'item.cd-t-3.description', icon: 'globe' },
        ],
      },
      {
        id: 'cerita-regeneratif',
        href: '#',
        nameKey: 'section.cerita-regeneratif.name',
        children: [
          { id: 'cd-r-1', href: `/${DESA}/panduan`, nameKey: 'item.cd-r-1.name', descriptionKey: 'item.cd-r-1.description', icon: 'book' },
          { id: 'cd-r-2', href: `/${DESA}/panduan`, nameKey: 'item.cd-r-2.name', descriptionKey: 'item.cd-r-2.description', icon: 'sparkles' },
          { id: 'cd-r-3', href: `/${DESA}/panduan`, nameKey: 'item.cd-r-3.name', descriptionKey: 'item.cd-r-3.description', icon: 'eye' },
        ],
      },
      {
        id: 'cerita-jejak',
        href: '#',
        nameKey: 'section.cerita-jejak.name',
        children: [
          { id: 'cd-j-3', href: '/#jejak-regeneratif', nameKey: 'item.cd-j-3.name', descriptionKey: 'item.cd-j-3.description', icon: 'cycle' },
          { id: 'cd-j-1', href: `/${DESA}/lestari/dana`, nameKey: 'item.cd-j-1.name', descriptionKey: 'item.cd-j-1.description', icon: 'money' },
          { id: 'cd-j-2', href: `/${DESA}/lestari/neraca`, nameKey: 'item.cd-j-2.name', descriptionKey: 'item.cd-j-2.description', icon: 'beaker' },
        ],
      },
      {
        id: 'cerita-gabung',
        href: '#',
        nameKey: 'section.cerita-gabung.name',
        children: [
          { id: 'cd-g-1', href: '/gabung?peran=wisatawan', nameKey: 'item.cd-g-1.name', descriptionKey: 'item.cd-g-1.description', icon: 'user' },
          { id: 'cd-g-2', href: '/gabung?peran=umkm', nameKey: 'item.cd-g-2.name', descriptionKey: 'item.cd-g-2.description', icon: 'shop' },
          { id: 'cd-g-3', href: '/gabung?peran=agen', nameKey: 'item.cd-g-3.name', descriptionKey: 'item.cd-g-3.description', icon: 'map' },
          { id: 'cd-g-4', href: '/gabung?peran=kontributor', nameKey: 'item.cd-g-4.name', descriptionKey: 'item.cd-g-4.description', icon: 'users' },
        ],
      },
    ],
  },
]

export const FOOTER_LINK_DEFS = [
  { href: `/${DESA}/berita`, labelKey: 'footerLinks.news' },
  { href: `/${DESA}/tentang`, labelKey: 'footerLinks.aboutVillage' },
  { href: `/${DESA}/panduan`, labelKey: 'footerLinks.visitGuide' },
  { href: `/${DESA}/pasar`, labelKey: 'footerLinks.villageMarket' },
] as const

export function localizeHref(path: string, locale: Locale): string {
  if (path === '#' || path.startsWith('mailto:') || path.startsWith('http')) return path
  if (path.includes('#')) {
    const [base, hash] = path.split('#')
    return `${withLocale(base || '/', locale)}#${hash}`
  }
  return withLocale(path, locale)
}
