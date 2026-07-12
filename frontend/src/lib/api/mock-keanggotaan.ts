import type { KeanggotaanAntrean } from './keanggotaan'

const MOCK: KeanggotaanAntrean[] = [
  { id: 'k-mock-1', pengguna_id: 'u-mock-umkm-1', peran: 'umkm', status: 'menunggu' },
  { id: 'k-mock-2', pengguna_id: 'u-mock-agen-1', peran: 'agen', status: 'menunggu' },
  { id: 'k-mock-3', pengguna_id: 'u-mock-kontrib-1', peran: 'kontributor', status: 'menunggu' },
]

export function mockAntreanKeanggotaan(status?: string): KeanggotaanAntrean[] {
  if (!status) return MOCK
  return MOCK.filter((k) => k.status === status)
}
