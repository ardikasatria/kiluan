import { apiFetch } from './client'
import { mockCuaca, mockProfilDesa } from './mock'
import type { CuacaResponse, ProfilDesa, Tag } from './types'

export async function getProfilDesa(slug: string): Promise<ProfilDesa | null> {
  try {
    return await apiFetch<ProfilDesa>(`/api/v1/desa/${slug}`, { auth: false })
  } catch {
    return mockProfilDesa(slug)
  }
}

export async function getTagDesa(slug: string): Promise<Tag[]> {
  try {
    const res = await apiFetch<{ item: Tag[] }>(`/api/v1/desa/${slug}/tag`)
    return res.item
  } catch {
    return []
  }
}

export async function getCuacaDesa(slug: string): Promise<CuacaResponse | null> {
  try {
    return await apiFetch<CuacaResponse>(`/api/v1/desa/${slug}/cuaca`, { auth: false })
  } catch {
    if (slug === 'teluk-kiluan') return mockCuaca()
    return {
      darat: { status: 'tak_tersedia' },
      maritim: null,
      sumber: 'BMKG',
      diperbarui: null,
    }
  }
}
