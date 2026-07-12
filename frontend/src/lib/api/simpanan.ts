import { apiFetch } from './client'
import { tambahAntrean } from '@/lib/offline/db'

export type SimpananTipe = 'destinasi' | 'paket' | 'misi'

export interface SimpananEntitasRingkas {
  nama: string
  slug: string
  subjudul?: string | null
  gambar_url?: string | null
}

export interface SimpananItem {
  id: string
  tipe: SimpananTipe
  entitas_id: string
  catatan?: string | null
  dibuat_pada?: string | null
  desa_id: string
  desa_slug: string
  desa_nama: string
  entitas: SimpananEntitasRingkas
}

export interface SimpananStatusItem {
  tipe: SimpananTipe
  entitas_id: string
  disimpan: boolean
  simpanan_id?: string | null
}

export async function getDaftarSimpanan(opts?: {
  tipe?: SimpananTipe
  batas?: number
  kursor?: string
}): Promise<{ item: SimpananItem[]; meta: { kursor_berikutnya: string | null; ada_lagi: boolean; batas: number } }> {
  const q = new URLSearchParams()
  if (opts?.tipe) q.set('tipe', opts.tipe)
  if (opts?.batas) q.set('batas', String(opts.batas))
  if (opts?.kursor) q.set('kursor', opts.kursor)
  const qs = q.toString()
  return apiFetch(`/api/v1/saya/simpanan${qs ? `?${qs}` : ''}`)
}

export async function cekStatusSimpanan(
  tipe: SimpananTipe,
  entitasIds: string[],
): Promise<SimpananStatusItem[]> {
  if (!entitasIds.length) return []
  const q = new URLSearchParams({ tipe })
  for (const id of entitasIds) q.append('entitas_id', id)
  const res = await apiFetch<{ item: SimpananStatusItem[] }>(`/api/v1/saya/simpanan/status?${q}`)
  return res.item
}

export async function tambahSimpanan(payload: {
  tipe: SimpananTipe
  entitas_id: string
  catatan?: string
}): Promise<SimpananItem> {
  return apiFetch('/api/v1/saya/simpanan', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function hapusSimpanan(id: string): Promise<void> {
  return apiFetch(`/api/v1/saya/simpanan/${id}`, { method: 'DELETE' })
}

export async function ubahCatatanSimpanan(id: string, catatan: string): Promise<SimpananItem> {
  return apiFetch(`/api/v1/saya/simpanan/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ catatan }),
  })
}

/** Tambah/hapus dengan antrean offline bila perlu. */
export async function tambahSimpananAman(
  desaSlug: string,
  payload: { tipe: SimpananTipe; entitas_id: string; catatan?: string },
): Promise<SimpananItem | { offline: true }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await tambahAntrean({
      desaSlug,
      method: 'POST',
      path: '/api/v1/saya/simpanan',
      body: JSON.stringify(payload),
    })
    return { offline: true }
  }
  try {
    return await tambahSimpanan(payload)
  } catch (err) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await tambahAntrean({
        desaSlug,
        method: 'POST',
        path: '/api/v1/saya/simpanan',
        body: JSON.stringify(payload),
      })
      return { offline: true }
    }
    throw err
  }
}

export async function hapusSimpananAman(
  desaSlug: string,
  id: string,
): Promise<{ offline: true } | void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await tambahAntrean({
      desaSlug,
      method: 'DELETE',
      path: `/api/v1/saya/simpanan/${id}`,
    })
    return { offline: true }
  }
  try {
    await hapusSimpanan(id)
  } catch {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await tambahAntrean({
        desaSlug,
        method: 'DELETE',
        path: `/api/v1/saya/simpanan/${id}`,
      })
      return { offline: true }
    }
    throw new Error('Gagal menghapus simpanan')
  }
}

export function urlDetailSimpanan(item: SimpananItem): string {
  const d = item.desa_slug
  if (item.tipe === 'destinasi') return `/${d}/spot/${item.entitas.slug}`
  if (item.tipe === 'paket') return `/${d}/paket/${item.entitas.slug}`
  return `/${d}/misi`
}

export function labelTipeSimpanan(tipe: SimpananTipe): string {
  if (tipe === 'destinasi') return 'Destinasi'
  if (tipe === 'paket') return 'Paket wisata'
  return 'Misi lestari'
}
