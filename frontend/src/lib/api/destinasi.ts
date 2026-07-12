import { apiFetch } from './client'
import {
  mockDestinasiDetail,
  mockDestinasiList,
} from './mock'
import type {
  DestinasiBuatPayload,
  DestinasiLengkap,
  DestinasiRingkas,
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
    return await apiFetch<CariResponse>(`/api/v1/desa/${slug}/destinasi${query}`, { auth: false })
  } catch {
    const item = mockDestinasiList(slug, true)
    return { item, meta: { kursor_berikutnya: null, ada_lagi: false, batas: params?.batas ?? 20 } }
  }
}

export async function getDestinasiDetail(slug: string, idOrSlug: string): Promise<DestinasiLengkap | null> {
  try {
    return await apiFetch<DestinasiLengkap>(`/api/v1/desa/${slug}/destinasi/${idOrSlug}`, { auth: false })
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

export async function hapusDestinasi(slug: string, id: string): Promise<void> {
  await apiFetch(`/api/v1/desa/${slug}/destinasi/${id}`, { method: 'DELETE' })
}

export async function setTagDestinasi(slug: string, id: string, tagIds: number[]): Promise<void> {
  await apiFetch(`/api/v1/desa/${slug}/destinasi/${id}/tag`, {
    method: 'POST',
    body: JSON.stringify({ tag_id: tagIds }),
  })
}

export async function hapusTagDestinasi(slug: string, id: string, tagId: number): Promise<void> {
  await apiFetch(`/api/v1/desa/${slug}/destinasi/${id}/tag/${tagId}`, { method: 'DELETE' })
}

export async function cariDestinasiKelolaFiltered(
  slug: string,
  params?: { status?: string; kategori?: number; batas?: number },
): Promise<CariResponse> {
  const qs = new URLSearchParams()
  qs.set('batas', String(params?.batas ?? 100))
  if (params?.status) qs.set('status', params.status)
  if (params?.kategori) qs.set('kategori', String(params.kategori))
  try {
    return await apiFetch<CariResponse>(`/api/v1/desa/${slug}/destinasi?${qs}`)
  } catch {
    let item = mockDestinasiList(slug, false)
    if (params?.status) item = item.filter((d) => d.status === params.status)
    if (params?.kategori) item = item.filter((d) => d.kategori_id === params.kategori)
    return { item, meta: { kursor_berikutnya: null, ada_lagi: false, batas: params?.batas ?? 100 } }
  }
}
