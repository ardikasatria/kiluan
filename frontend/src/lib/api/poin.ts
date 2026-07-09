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

export async function buatKuponKampanye(
  desaSlug: string,
  body: {
    kode: string
    nilai: number
    tipe_diskon?: string
    min_belanja?: number
    batas_pakai?: number
    penyedia_terbatas?: string[]
  },
): Promise<{ kupon: KuponRingkas }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/kupon`, {
    method: 'POST',
    body: JSON.stringify({ ...body, sumber: 'kampanye' }),
  })
}
