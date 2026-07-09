import { apiFetch } from './client'
import { konfirmasiMedia, presignMedia, unggahKeMinio } from './media'
import { tambahAntrean } from '@/lib/offline/db'
import type {
  MisiDetail,
  MisiRingkas,
  MisiSelesaiPayload,
  PasporDto,
  StasiunLestariDto,
  StempelDto,
  VerifikasiDto,
} from './types'

export async function getMisi(
  desaSlug: string,
  params?: { jenis?: string; kategori?: string },
): Promise<{ item: MisiRingkas[] }> {
  const q = new URLSearchParams()
  if (params?.jenis) q.set('jenis', params.jenis)
  if (params?.kategori) q.set('kategori', params.kategori)
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/misi${qs ? `?${qs}` : ''}`)
}

export async function getMisiDetail(desaSlug: string, id: string): Promise<{ misi: MisiDetail }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/misi/${id}`)
}

export async function selesaiMisi(
  desaSlug: string,
  misiId: string,
  body: MisiSelesaiPayload,
): Promise<{ stempel: StempelDto; verifikasi: VerifikasiDto; offline?: boolean }> {
  const path = `/api/v1/desa/${desaSlug}/misi/${misiId}/selesai`
  const payload = JSON.stringify(body)

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await tambahAntrean({ desaSlug, method: 'POST', path, body: payload })
    return {
      stempel: {
        id: 'offline',
        misi_id: misiId,
        status: 'menunggu_verifikasi',
        dampak: body.dampak ?? {},
        dibuat_pada: new Date().toISOString(),
      },
      verifikasi: {
        id: 'offline',
        entitas_tipe: 'stempel',
        entitas_id: 'offline',
        metode: 'qr_checkin',
        hasil: 'menunggu',
        dibuat_pada: new Date().toISOString(),
      },
      offline: true,
    }
  }

  return apiFetch(path, { method: 'POST', body: payload })
}

export async function getPasporSaya(desaSlug: string): Promise<PasporDto> {
  return apiFetch(`/api/v1/desa/${desaSlug}/paspor/saya`)
}

export async function getStempelSaya(
  desaSlug: string,
  status?: string,
): Promise<{ item: StempelDto[] }> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch(`/api/v1/desa/${desaSlug}/stempel/saya${qs}`)
}

export async function getStasiun(desaSlug: string): Promise<{ item: StasiunLestariDto[] }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/stasiun`)
}

export async function getVerifikasiAntrean(
  desaSlug: string,
  params?: { entitas_tipe?: string; hasil?: string },
): Promise<{ item: VerifikasiDto[] }> {
  const q = new URLSearchParams()
  if (params?.entitas_tipe) q.set('entitas_tipe', params.entitas_tipe)
  if (params?.hasil) q.set('hasil', params.hasil)
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/verifikasi${qs ? `?${qs}` : ''}`)
}

export async function putuskanVerifikasi(
  desaSlug: string,
  verifikasiId: string,
  hasil: 'valid' | 'invalid',
  catatan = '',
): Promise<{ verifikasi: VerifikasiDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/verifikasi/${verifikasiId}/putuskan`, {
    method: 'POST',
    body: JSON.stringify({ hasil, catatan }),
  })
}

export async function unggahBuktiFoto(desaSlug: string, file: File): Promise<string> {
  const pr = await presignMedia(desaSlug, file)
  await unggahKeMinio(pr.url_unggah, file)
  await konfirmasiMedia(desaSlug, {
    media_id: pr.media_id,
    tipe: 'foto',
    alt: file.name.replace(/\.[^.]+$/, ''),
  })
  return pr.media_id
}

export function ambilLokasi(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolokasi tidak didukung'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  })
}
