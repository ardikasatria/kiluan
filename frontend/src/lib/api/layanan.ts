import { apiFetch } from './client'
import { mockLayanan } from './mock'
import type { LayananBuatPayload, LayananItem } from './types'

export interface LayananQuery {
  jenis?: string
  destinasi_id?: string
  status?: string
}

export async function getLayananDesa(slug: string, params?: LayananQuery): Promise<LayananItem[]> {
  const qs = new URLSearchParams()
  if (params?.jenis) qs.set('jenis', params.jenis)
  if (params?.destinasi_id) qs.set('destinasi_id', params.destinasi_id)
  if (params?.status) qs.set('status', params.status)
  const query = qs.toString() ? `?${qs}` : ''
  try {
    const res = await apiFetch<{ item: LayananItem[] }>(`/api/v1/desa/${slug}/layanan${query}`)
    return res.item
  } catch {
    let item = mockLayanan(slug)
    if (params?.jenis) item = item.filter((l) => l.jenis === params.jenis)
    if (params?.destinasi_id) item = item.filter((l) => l.destinasi_id === params.destinasi_id)
    if (params?.status) item = item.filter((l) => l.status === params.status)
    return item
  }
}

export async function buatLayanan(slug: string, payload: LayananBuatPayload): Promise<LayananItem> {
  return apiFetch(`/api/v1/desa/${slug}/layanan`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function ubahLayanan(
  slug: string,
  id: string,
  payload: Partial<LayananBuatPayload>,
): Promise<LayananItem> {
  return apiFetch(`/api/v1/desa/${slug}/layanan/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function hapusLayanan(slug: string, id: string): Promise<void> {
  await apiFetch(`/api/v1/desa/${slug}/layanan/${id}`, { method: 'DELETE' })
}
