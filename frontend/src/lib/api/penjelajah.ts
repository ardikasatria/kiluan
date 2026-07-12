import { apiFetch } from './client'
import {
  mockDaftarMisi,
  mockDetailMisi,
  mockStasiun,
  mockVerifikasiAntrean,
} from './mock-penjelajah'
import { konfirmasiMedia, presignMedia, unggahKeMinio } from './media'
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
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/misi${qs ? `?${qs}` : ''}`, { auth: false })
  } catch {
    return mockDaftarMisi(params)
  }
}

export async function getMisiDetail(desaSlug: string, id: string): Promise<{ misi: MisiDetail }> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/misi/${id}`, { auth: false })
  } catch {
    const mock = mockDetailMisi(id)
    if (!mock) throw new Error('Misi tidak ditemukan')
    return mock
  }
}

export async function selesaiMisi(
  desaSlug: string,
  misiId: string,
  body: MisiSelesaiPayload,
): Promise<{ stempel: StempelDto; verifikasi: VerifikasiDto }> {
  const path = `/api/v1/desa/${desaSlug}/misi/${misiId}/selesai`
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
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
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/stasiun`, { auth: false })
  } catch {
    return mockStasiun()
  }
}

export async function getVerifikasiAntrean(
  desaSlug: string,
  params?: { entitas_tipe?: string; hasil?: string },
): Promise<{ item: VerifikasiDto[] }> {
  const q = new URLSearchParams()
  if (params?.entitas_tipe) q.set('entitas_tipe', params.entitas_tipe)
  if (params?.hasil) q.set('hasil', params.hasil)
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/verifikasi${qs ? `?${qs}` : ''}`)
  } catch {
    return mockVerifikasiAntrean()
  }
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
