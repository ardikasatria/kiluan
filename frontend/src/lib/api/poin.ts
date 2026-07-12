import { apiFetch } from './client'
import { mockHadiah, mockKuponSaya, mockPenukaran } from './mock-poin'
import type { HadiahDto, KuponRingkas, PenukaranDto } from './types'

function hdrIdem(key: string): HeadersInit {
  return { 'Idempotency-Key': key }
}

export async function getHadiah(desaSlug: string): Promise<{ item: HadiahDto[] }> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/hadiah`)
  } catch {
    return mockHadiah()
  }
}

export async function getHadiahDetail(desaSlug: string, hadiahId: string): Promise<{ hadiah: HadiahDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/hadiah/${hadiahId}`)
}

export async function tukarHadiah(
  desaSlug: string,
  hadiahId: string,
  idempotencyKey: string,
): Promise<{ penukaran: PenukaranDto; kupon: KuponRingkas | null }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/tukar`, {
    method: 'POST',
    headers: hdrIdem(idempotencyKey),
    body: JSON.stringify({ hadiah_id: hadiahId }),
  })
}

export async function getPenukaranSaya(desaSlug: string): Promise<{ item: PenukaranDto[] }> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/penukaran/saya`)
  } catch {
    return mockPenukaran()
  }
}

export async function getKuponSaya(desaSlug: string): Promise<{ item: KuponRingkas[] }> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/kupon/saya`)
  } catch {
    return mockKuponSaya()
  }
}

export async function buatHadiah(
  desaSlug: string,
  body: {
    nama: string
    jenis: string
    biaya_poin: number
    deskripsi?: string
    stok?: number
    syarat?: Record<string, unknown>
  },
): Promise<{ hadiah: HadiahDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/hadiah`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function ubahHadiah(
  desaSlug: string,
  hadiahId: string,
  body: Partial<Pick<HadiahDto, 'nama' | 'deskripsi' | 'biaya_poin' | 'stok' | 'syarat' | 'aktif'>>,
): Promise<{ hadiah: HadiahDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/hadiah/${hadiahId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export interface BuatKuponPayload {
  kode: string
  sumber: 'kampanye' | 'promo_owner'
  nilai: number
  tipe_diskon: 'persen' | 'nominal'
  min_belanja?: number
  batas_pakai?: number
  penyedia_terbatas?: string[]
  berlaku_mulai?: string
  berlaku_sampai?: string
}

export async function buatKupon(
  desaSlug: string,
  body: BuatKuponPayload,
): Promise<{ kupon: KuponRingkas }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/kupon`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function buatKuponKampanye(
  desaSlug: string,
  body: Omit<BuatKuponPayload, 'sumber'>,
): Promise<{ kupon: KuponRingkas }> {
  return buatKupon(desaSlug, { ...body, sumber: 'kampanye' })
}

export function buatKuponPromoOwner(
  desaSlug: string,
  body: Omit<BuatKuponPayload, 'sumber'>,
): Promise<{ kupon: KuponRingkas }> {
  return buatKupon(desaSlug, { ...body, sumber: 'promo_owner' })
}
