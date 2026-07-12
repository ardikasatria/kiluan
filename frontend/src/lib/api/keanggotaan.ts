import { apiFetch } from './client'
import type { KeanggotaanSaya } from './auth'
import { mockAntreanKeanggotaan } from './mock-keanggotaan'
import type { PeranKode } from '@/lib/kiluan/peran'

export interface KeanggotaanItem extends KeanggotaanSaya {
  id: string
}

export interface KeanggotaanAntrean {
  id: string
  pengguna_id: string
  peran: PeranKode
  status: string
}

export type StatusKeputusanKeanggotaan = 'aktif' | 'ditolak' | 'nonaktif' | 'revisi'

export async function getKeanggotaanSaya(): Promise<KeanggotaanItem[]> {
  const res = await apiFetch<{ item: KeanggotaanItem[] }>('/api/v1/saya/keanggotaan')
  return res.item
}

export async function ajukanKeanggotaan(
  desaSlug: string,
  peran: string,
): Promise<{ id: string; peran: string; status: string }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/keanggotaan`, {
    method: 'POST',
    body: JSON.stringify({ peran }),
  })
}

export async function daftarKeanggotaan(
  desaSlug: string,
  opts?: { peran?: string; status?: string },
): Promise<{ item: KeanggotaanAntrean[] }> {
  const q = new URLSearchParams()
  if (opts?.peran) q.set('peran', opts.peran)
  if (opts?.status) q.set('status', opts.status)
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/keanggotaan${qs ? `?${qs}` : ''}`)
  } catch {
    return { item: mockAntreanKeanggotaan(opts?.status) }
  }
}

export async function putuskanKeanggotaan(
  desaSlug: string,
  keanggotaanId: string,
  status: StatusKeputusanKeanggotaan,
): Promise<{ id: string; peran: string; status: string }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/keanggotaan/${keanggotaanId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
