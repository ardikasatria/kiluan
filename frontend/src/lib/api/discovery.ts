import { apiFetch } from './client'
import { mockDestinasiDiscovery, mockDaftarDesa } from './mock'
import type { DesaRingkas, DestinasiRingkas, DiscoveryParams, MetaPaginasi } from './types'

interface CariDestinasiResponse {
  item: DestinasiRingkas[]
  meta: MetaPaginasi
}

interface DaftarDesaResponse {
  item: DesaRingkas[]
  meta: MetaPaginasi
}

function qs(params?: DiscoveryParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.desa) search.set('desa', params.desa)
  if (params.kategori != null) search.set('kategori', String(params.kategori))
  if (params.tag) search.set('tag', params.tag)
  if (params.dekat) search.set('dekat', params.dekat)
  if (params.radius_m != null) search.set('radius_m', String(params.radius_m))
  if (params.batas != null) search.set('batas', String(params.batas))
  if (params.kursor) search.set('kursor', params.kursor)
  const s = search.toString()
  return s ? `?${s}` : ''
}

export async function cariDestinasiDiscovery(params?: DiscoveryParams): Promise<CariDestinasiResponse> {
  try {
    return await apiFetch<CariDestinasiResponse>(`/api/v1/discovery/destinasi${qs(params)}`, { auth: false })
  } catch {
    return mockDestinasiDiscovery(params)
  }
}

export async function daftarDesaDiscovery(params?: Omit<DiscoveryParams, 'desa' | 'kategori' | 'tag'>): Promise<DaftarDesaResponse> {
  try {
    return await apiFetch<DaftarDesaResponse>(`/api/v1/discovery/desa${qs(params)}`, { auth: false })
  } catch {
    return mockDaftarDesa(params)
  }
}
