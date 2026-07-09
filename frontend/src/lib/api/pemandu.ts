import { apiFetch } from './client'
import type {
  PemanduChatRes,
  PemanduEstimasiRes,
  PemanduItineraryRes,
  SesiPemanduDto,
} from './types'

export async function susunItinerary(
  desaSlug: string,
  body: {
    durasi_hari?: number
    minat?: string[]
    budget?: number
    tanggal_mulai?: string
    jumlah_orang?: number
  },
): Promise<PemanduItineraryRes> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pemandu/itinerary`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function estimasiPemandu(
  desaSlug: string,
  item: Array<{ item_tipe: string; item_id: string; jumlah: number }>,
): Promise<PemanduEstimasiRes> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pemandu/estimasi`, {
    method: 'POST',
    body: JSON.stringify({ item }),
  })
}

export async function chatPemandu(
  desaSlug: string,
  pesan: string,
  sesiId?: string,
): Promise<PemanduChatRes> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pemandu/chat`, {
    method: 'POST',
    body: JSON.stringify({ pesan, sesi_id: sesiId ?? null }),
  })
}

export async function getSesiPemandu(desaSlug: string, sesiId: string): Promise<SesiPemanduDto> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pemandu/sesi/${sesiId}`)
}
