import type { Metadata } from 'next'

import { HALAMAN_PUBLIK_DESA } from './meta-halaman'

export const NAMA_SITUS = 'sigerciv'
export const DESKRIPSI_DEFAULT =
  'sigerciv — platform desa wisata regeneratif berbasis komunitas. Temukan destinasi, dukung UMKM lokal, dan ikut misi lestari.'
export const GAMBAR_OG_DEFAULT = '/sigerciv-long.png'

/** URL kanonis situs — wajib diset `NEXT_PUBLIC_SITE_URL` di produksi. */
export function urlSitus(): string {
  const dariEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (dariEnv) return dariEnv
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

function urlAbsolut(path: string): string {
  const base = urlSitus()
  if (path.startsWith('http')) return path
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function urlGambar(gambar?: string | null): string {
  if (!gambar) return urlAbsolut(GAMBAR_OG_DEFAULT)
  return urlAbsolut(gambar)
}

export interface OpsiMetadata {
  /** Judul halaman (template root menambahkan " - sigerciv" pada <title>). */
  judul: string
  deskripsi?: string
  /** Path relatif, mis. `/teluk-kiluan/berita` */
  path?: string
  gambar?: string | null
  noindex?: boolean
  tipe?: 'website' | 'article'
}

/** Metadata lengkap: judul, deskripsi, canonical, Open Graph & Twitter Card. */
export function buatMetadata(opts: OpsiMetadata): Metadata {
  const deskripsi = opts.deskripsi ?? DESKRIPSI_DEFAULT
  const url = opts.path ? urlAbsolut(opts.path) : urlSitus()
  const gambar = urlGambar(opts.gambar)
  const judulBagikan = opts.judul.includes(NAMA_SITUS) ? opts.judul : `${opts.judul} | ${NAMA_SITUS}`

  return {
    title: opts.judul,
    description: deskripsi,
    alternates: opts.path ? { canonical: url } : undefined,
    openGraph: {
      title: judulBagikan,
      description: deskripsi,
      url,
      siteName: NAMA_SITUS,
      locale: 'id_ID',
      type: opts.tipe ?? 'website',
      images: [{ url: gambar, alt: opts.judul }],
    },
    twitter: {
      card: 'summary_large_image',
      title: judulBagikan,
      description: deskripsi,
      images: [gambar],
    },
    robots: opts.noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
  }
}

/** Metadata halaman publik per desa. */
export function metadataDesa(opts: {
  judul: string
  desaSlug: string
  desaNama?: string
  path: string
  deskripsi?: string
  gambar?: string | null
  tipe?: 'website' | 'article'
}): Metadata {
  const nama = opts.desaNama ?? opts.desaSlug
  return buatMetadata({
    judul: `${opts.judul} — ${nama}`,
    deskripsi: opts.deskripsi ?? `${opts.judul} di ${nama} — sigerciv.`,
    path: `/${opts.desaSlug}${opts.path}`,
    gambar: opts.gambar,
    tipe: opts.tipe,
  })
}

/** Metadata panel kelola (privat, noindex). */
export function metadataKelola(judul: string, desaSlug: string, subpath = ''): Metadata {
  return buatMetadata({
    judul: `${judul} — Kelola`,
    deskripsi: `Panel pengelola ${judul.toLowerCase()} di sigerciv.`,
    path: `/${desaSlug}/kelola${subpath}`,
    noindex: true,
  })
}

/** Metadata halaman privat (akun, transaksi). */
export function metadataPrivat(
  judul: string,
  desaSlug: string,
  path: string,
  deskripsi?: string,
): Metadata {
  const pathKanons = desaSlug === 'sigerciv' ? path : `/${desaSlug}${path}`
  return buatMetadata({
    judul,
    deskripsi: deskripsi ?? `${judul} — sigerciv.`,
    path: pathKanons,
    noindex: true,
  })
}

/** Metadata dari daftar halaman publik statis per desa. */
export function metadataHalamanPublik(
  desaSlug: string,
  segment: string,
  desaNama?: string,
): Metadata | undefined {
  const path = segment.startsWith('/') ? segment : `/${segment}`
  const hal = HALAMAN_PUBLIK_DESA.find((h) => h.path === path)
  if (!hal) return undefined
  return metadataDesa({
    judul: hal.judul,
    desaSlug,
    desaNama,
    path: hal.path,
    deskripsi: hal.deskripsi,
  })
}

/** Metadata dasbor (privat, noindex). */
export function metadataDasbor(judul: string, desaSlug: string, subpath = ''): Metadata {
  return buatMetadata({
    judul: `${judul} — Dasbor`,
    deskripsi: 'Dasbor sigerciv sesuai peran keanggotaan Anda.',
    path: `/${desaSlug}/dasbor${subpath}`,
    noindex: true,
  })
}
