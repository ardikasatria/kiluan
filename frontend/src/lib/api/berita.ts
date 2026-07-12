import { apiFetch } from './client'
import { mockBeritaDetail, mockDaftarBerita } from './mock-berita'
import type {
  BeritaBuatPayload,
  BeritaDetail,
  BeritaRingkas,
  BeritaUbahPayload,
  KategoriBerita,
  MetaPaginasi,
  StatusBerita,
} from './types'

export async function getDaftarBerita(
  desaSlug: string,
  opts?: {
    kategori?: KategoriBerita
    tag?: string
    sorotan?: boolean
    status?: StatusBerita
    kelola?: boolean
    kursor?: string
    batas?: number
  },
): Promise<{ item: BeritaRingkas[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams()
  if (opts?.kategori) q.set('kategori', opts.kategori)
  if (opts?.tag) q.set('tag', opts.tag)
  if (opts?.sorotan) q.set('sorotan', 'true')
  if (opts?.status) q.set('status', opts.status)
  if (opts?.kursor) q.set('kursor', opts.kursor)
  if (opts?.batas) q.set('batas', String(opts.batas))
  if (opts?.kelola) q.set('kelola', 'true')
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/berita${qs ? `?${qs}` : ''}`, {
      auth: opts?.kelola ?? false,
    })
  } catch {
    return mockDaftarBerita(opts)
  }
}

export async function getBeritaDetail(
  desaSlug: string,
  idOrSlug: string,
  kelola = false,
): Promise<BeritaDetail | null> {
  try {
    const qs = kelola ? '?kelola=true' : ''
    return await apiFetch(`/api/v1/desa/${desaSlug}/berita/${idOrSlug}${qs}`, {
      auth: kelola,
    })
  } catch {
    return mockBeritaDetail(idOrSlug, kelola)
  }
}

export async function buatBerita(desaSlug: string, body: BeritaBuatPayload): Promise<BeritaDetail> {
  return apiFetch(`/api/v1/desa/${desaSlug}/berita`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function ubahBerita(
  desaSlug: string,
  id: string,
  body: BeritaUbahPayload,
): Promise<BeritaDetail> {
  return apiFetch(`/api/v1/desa/${desaSlug}/berita/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function ubahStatusBerita(
  desaSlug: string,
  id: string,
  status: StatusBerita,
  terbit_pada?: string | null,
): Promise<BeritaDetail> {
  return apiFetch(`/api/v1/desa/${desaSlug}/berita/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, terbit_pada }),
  })
}

export async function hapusBerita(desaSlug: string, id: string): Promise<void> {
  return apiFetch(`/api/v1/desa/${desaSlug}/berita/${id}`, { method: 'DELETE' })
}

export async function tambahTagBerita(
  desaSlug: string,
  beritaId: string,
  tagId: number,
): Promise<BeritaDetail> {
  return apiFetch(`/api/v1/desa/${desaSlug}/berita/${beritaId}/tag`, {
    method: 'POST',
    body: JSON.stringify({ tag_id: tagId }),
  })
}

export async function hapusTagBerita(
  desaSlug: string,
  beritaId: string,
  tagId: number,
): Promise<BeritaDetail> {
  return apiFetch(`/api/v1/desa/${desaSlug}/berita/${beritaId}/tag/${tagId}`, { method: 'DELETE' })
}
