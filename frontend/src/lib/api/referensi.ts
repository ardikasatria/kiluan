import { apiFetch } from './client'
import type { Kategori } from './types'

const MOCK_KATEGORI: Kategori[] = [
  { id: 1, kode: 'snorkeling', nama: 'Snorkeling' },
  { id: 2, kode: 'pantai', nama: 'Pantai' },
  { id: 3, kode: 'tracking', nama: 'Tracking' },
]

export async function getKategori(): Promise<Kategori[]> {
  try {
    const res = await apiFetch<{ item: Kategori[] }>('/api/v1/kategori', { auth: false })
    return res.item
  } catch {
    return MOCK_KATEGORI
  }
}
