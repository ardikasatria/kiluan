import { apiFetch } from './client'
import type { KeanggotaanSaya } from './auth'

export interface KeanggotaanItem extends KeanggotaanSaya {
  id: string
}

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
