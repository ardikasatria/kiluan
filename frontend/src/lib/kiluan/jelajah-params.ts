import type { Kategori, Lokasi } from '@/lib/api/types'

export type LensaJelajah = 'desa' | 'wisata'

/** Pusat Lampung — fallback geolokasi ditolak */
export const PUSAT_LAMPUNG: Lokasi = { lat: -5.45, lng: 105.27 }

export const RADIUS_DEKAT_DESTINASI_M = 50_000
export const RADIUS_DEKAT_DESA_M = 100_000

export interface JelajahParams {
  q?: string
  kategori?: number
  desa?: string
  tag?: string
  dekat?: string
  lensa?: LensaJelajah
}

export function resolveKategoriParam(
  raw: string | undefined,
  daftar: Kategori[],
): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  if (!Number.isNaN(n) && n > 0) return n
  return daftar.find((k) => k.kode === raw)?.id
}

export function parseJelajahParams(
  sp: Record<string, string | string[] | undefined>,
  kategori: Kategori[] = [],
): JelajahParams {
  const q = typeof sp.q === 'string' && sp.q.trim() ? sp.q.trim() : undefined
  const desa = typeof sp.desa === 'string' && sp.desa.trim() ? sp.desa.trim() : undefined
  const tag = typeof sp.tag === 'string' && sp.tag.trim() ? sp.tag.trim() : undefined
  const dekat = typeof sp.dekat === 'string' && sp.dekat.includes(',') ? sp.dekat : undefined
  const kategoriId = resolveKategoriParam(
    typeof sp.kategori === 'string' ? sp.kategori : undefined,
    kategori,
  )
  let lensa: LensaJelajah =
    sp.lensa === 'wisata' ? 'wisata' : sp.lensa === 'desa' ? 'desa' : desa ? 'wisata' : 'desa'

  return { q, kategori: kategoriId, desa, tag, dekat, lensa }
}

export function buildJelajahQuery(params: JelajahParams): string {
  const s = new URLSearchParams()
  if (params.q) s.set('q', params.q)
  if (params.kategori != null) s.set('kategori', String(params.kategori))
  if (params.desa) s.set('desa', params.desa)
  if (params.tag) s.set('tag', params.tag)
  if (params.dekat) s.set('dekat', params.dekat)
  if (params.lensa) s.set('lensa', params.lensa)
  const str = s.toString()
  return str ? `?${str}` : ''
}

export function buildJelajahHref(params: JelajahParams): string {
  return `/jelajah${buildJelajahQuery(params)}`
}
