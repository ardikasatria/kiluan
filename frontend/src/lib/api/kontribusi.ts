import { apiFetch } from './client'
import { mockAntreanKurasi, mockKontribusiSaya } from './mock-kontribusi'
import type { KontribusiItem, MetaPaginasi } from './types'

export async function kirimKontribusi(
  desaSlug: string,
  body: Record<string, unknown>,
): Promise<KontribusiItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/kontribusi`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getKontribusiSaya(
  desaSlug: string,
  opts?: { kursor?: string; batas?: number },
): Promise<{ item: KontribusiItem[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams({ milik: 'saya' })
  if (opts?.kursor) q.set('kursor', opts.kursor)
  if (opts?.batas) q.set('batas', String(opts.batas))
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/kontribusi?${q}`)
  } catch {
    return mockKontribusiSaya()
  }
}

export async function getAntreanKurasi(
  desaSlug: string,
  opts?: { status?: string; tipe?: string; target_tipe?: string; kursor?: string; batas?: number },
): Promise<{ item: KontribusiItem[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams()
  if (opts?.status) q.set('status', opts.status)
  if (opts?.tipe) q.set('tipe', opts.tipe)
  if (opts?.target_tipe) q.set('target_tipe', opts.target_tipe)
  if (opts?.kursor) q.set('kursor', opts.kursor)
  if (opts?.batas) q.set('batas', String(opts.batas))
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/kontribusi${qs ? `?${qs}` : ''}`)
  } catch {
    return mockAntreanKurasi(opts?.status)
  }
}

export async function getDetailKontribusi(desaSlug: string, id: string): Promise<KontribusiItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/kontribusi/${id}`)
}

export async function revisiKontribusi(
  desaSlug: string,
  id: string,
  muatan: Record<string, unknown>,
  mediaId?: string,
): Promise<KontribusiItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/kontribusi/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ muatan, media_id: mediaId ?? null }),
  })
}

export async function transisiKontribusi(
  desaSlug: string,
  id: string,
  aksi: string,
  catatan = '',
): Promise<KontribusiItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/kontribusi/${id}/transisi`, {
    method: 'POST',
    body: JSON.stringify({ aksi, catatan }),
  })
}
