import { apiFetch } from './client'
import { mockKalender } from './mock'
import type { KalenderBuatPayload, KalenderItem } from './types'

export interface KalenderQuery {
  destinasi_id?: string
  tipe?: string
}

export async function getKalenderDesa(slug: string, params?: KalenderQuery): Promise<KalenderItem[]> {
  const qs = new URLSearchParams()
  if (params?.destinasi_id) qs.set('destinasi_id', params.destinasi_id)
  if (params?.tipe) qs.set('tipe', params.tipe)
  const query = qs.toString() ? `?${qs}` : ''
  try {
    const res = await apiFetch<{ item: KalenderItem[] }>(`/api/v1/desa/${slug}/kalender${query}`)
    return res.item
  } catch {
    let item = mockKalender(slug)
    if (params?.destinasi_id) item = item.filter((k) => k.destinasi_id === params.destinasi_id)
    if (params?.tipe) item = item.filter((k) => k.tipe === params.tipe)
    return item
  }
}

export async function buatKalender(slug: string, payload: KalenderBuatPayload): Promise<KalenderItem> {
  return apiFetch(`/api/v1/desa/${slug}/kalender`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function ubahKalender(
  slug: string,
  id: string,
  payload: Partial<KalenderBuatPayload>,
): Promise<KalenderItem> {
  return apiFetch(`/api/v1/desa/${slug}/kalender/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function nonaktifkanKalender(slug: string, id: string): Promise<KalenderItem> {
  return ubahKalender(slug, id, { status: 'nonaktif' })
}

export async function hapusKalender(slug: string, id: string): Promise<void> {
  await apiFetch(`/api/v1/desa/${slug}/kalender/${id}`, { method: 'DELETE' })
}
