import { apiFetch } from './client'
import type { Kategori } from './types'

export interface PeranRef {
  kode: string
  nama: string
  scoped_desa: boolean
}

const MOCK_PERAN: PeranRef[] = [
  { kode: 'wisatawan', nama: 'Wisatawan', scoped_desa: false },
  { kode: 'pokdarwis', nama: 'Pokdarwis', scoped_desa: true },
  { kode: 'umkm', nama: 'UMKM', scoped_desa: true },
  { kode: 'agen', nama: 'Agen Lokal', scoped_desa: true },
  { kode: 'kontributor', nama: 'Kontributor Umum', scoped_desa: false },
  { kode: 'organisasi', nama: 'Organisasi/Mitra', scoped_desa: true },
  { kode: 'perangkat_desa', nama: 'Perangkat Desa', scoped_desa: true },
  { kode: 'admin', nama: 'Admin/Steward', scoped_desa: false },
]

const MOCK_KATEGORI: Kategori[] = [
  { id: 1, kode: 'snorkeling', nama: 'Snorkeling' },
  { id: 2, kode: 'pantai', nama: 'Pantai' },
  { id: 3, kode: 'lumba-lumba', nama: 'Lumba-lumba' },
  { id: 4, kode: 'mangrove', nama: 'Mangrove' },
  { id: 5, kode: 'budaya', nama: 'Budaya' },
  { id: 6, kode: 'kuliner', nama: 'Kuliner' },
  { id: 7, kode: 'tracking', nama: 'Tracking' },
]

export async function getPeran(): Promise<PeranRef[]> {
  try {
    const res = await apiFetch<{ item: PeranRef[] }>('/api/v1/peran', { auth: false })
    return res.item
  } catch {
    return MOCK_PERAN
  }
}

export async function getKategori(): Promise<Kategori[]> {
  try {
    const res = await apiFetch<{ item: Kategori[] }>('/api/v1/kategori', { auth: false })
    return res.item
  } catch {
    return MOCK_KATEGORI
  }
}
