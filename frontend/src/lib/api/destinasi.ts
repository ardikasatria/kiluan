import { apiFetch } from './client'
import {
  mockDestinasiDetail,
  mockDestinasiList,
  mockKalender,
  mockLayanan,
} from './mock'
import type {
  DestinasiBuatPayload,
  DestinasiLengkap,
  DestinasiRingkas,
  KalenderItem,
  LayananItem,
  MetaPaginasi,
} from './types'

interface CariResponse {
  item: DestinasiRingkas[]
  meta: MetaPaginasi
}

export async function cariDestinasiKelola(slug: string): Promise<CariResponse> {
  try {
    return await apiFetch<CariResponse>(`/api/v1/desa/${slug}/destinasi?batas=100`)
  } catch {
    return {
      item: mockDestinasiList(slug, false),
      meta: { kursor_berikutnya: null, ada_lagi: false, batas: 100 },
    }
  }
}

export async function cariDestinasi(
  slug: string,
  params?: { q?: string; kategori?: number; batas?: number },
): Promise<CariResponse> {
  const qs = new URLSearchParams()
  if (params?.q) qs.set('q', params.q)
  if (params?.kategori) qs.set('kategori', String(params.kategori))
  if (params?.batas) qs.set('batas', String(params.batas))
  const query = qs.toString() ? `?${qs}` : ''
  try {
    return await apiFetch<CariResponse>(`/api/v1/desa/${slug}/destinasi${query}`)
  } catch {
    const item = mockDestinasiList(slug, true)
    return { item, meta: { kursor_berikutnya: null, ada_lagi: false, batas: params?.batas ?? 20 } }
  }
}

export async function getDestinasiDetail(slug: string, idOrSlug: string): Promise<DestinasiLengkap | null> {
  try {
    return await apiFetch<DestinasiLengkap>(`/api/v1/desa/${slug}/destinasi/${idOrSlug}`)
  } catch {
    return mockDestinasiDetail(slug, idOrSlug)
  }
}

export async function buatDestinasi(
  slug: string,
  payload: DestinasiBuatPayload,
): Promise<DestinasiRingkas> {
  return apiFetch(`/api/v1/desa/${slug}/destinasi`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function ubahDestinasi(
  slug: string,
  id: string,
  payload: Partial<DestinasiBuatPayload>,
): Promise<DestinasiRingkas> {
  return apiFetch(`/api/v1/desa/${slug}/destinasi/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function ubahStatusDestinasi(
  slug: string,
  id: string,
  status: string,
): Promise<DestinasiRingkas> {
  return apiFetch(`/api/v1/desa/${slug}/destinasi/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function getLayananDesa(slug: string): Promise<LayananItem[]> {
  try {
    const res = await apiFetch<{ item: LayananItem[] }>(`/api/v1/desa/${slug}/layanan`)
    return res.item
  } catch {
    return mockLayanan(slug)
  }
}

export async function getKalenderDesa(slug: string): Promise<KalenderItem[]> {
  try {
    const res = await apiFetch<{ item: KalenderItem[] }>(`/api/v1/desa/${slug}/kalender`)
    return res.item
  } catch {
    return mockKalender(slug)
  }
}
