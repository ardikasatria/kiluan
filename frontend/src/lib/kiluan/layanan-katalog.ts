/** Slug URL publik → jenis enum layanan backend. */
export const SLUG_KATALOG_LAYANAN: Record<string, string> = {
  penginapan: 'penginapan',
  'sewa-alat': 'sewa_alat',
  transport: 'transportasi',
}

export function jenisDariSlugLayanan(slug: string): string | null {
  return SLUG_KATALOG_LAYANAN[slug] ?? null
}

export const SLUGS_KATALOG_LAYANAN = Object.keys(SLUG_KATALOG_LAYANAN)
