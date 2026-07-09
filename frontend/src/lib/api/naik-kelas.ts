import { apiFetch } from './client'
import {
  mockAntreanValidasi,
  mockKartuAksi,
  mockPengajuanSaya,
  mockSertifikasi,
} from './mock-naik-kelas'
import type { KartuAksiItem, MetaPaginasi, PengajuanKartuItem, SertifikasiItem } from './types'

export async function getKartuAksi(desaSlug: string): Promise<{ item: KartuAksiItem[] }> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/kartu-aksi`)
  } catch {
    return mockKartuAksi()
  }
}

export async function getKartuAksiDetail(desaSlug: string, id: number): Promise<KartuAksiItem> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/kartu-aksi/${id}`)
  } catch {
    return mockKartuAksi().item.find((k) => k.id === id) ?? mockKartuAksi().item[0]
  }
}

export async function ajukanKartu(
  desaSlug: string,
  body: Record<string, unknown>,
): Promise<PengajuanKartuItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pengajuan-kartu`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getPengajuanSaya(
  desaSlug: string,
  opts?: { kursor?: string; batas?: number },
): Promise<{ item: PengajuanKartuItem[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams({ milik: 'saya' })
  if (opts?.kursor) q.set('kursor', opts.kursor)
  if (opts?.batas) q.set('batas', String(opts.batas))
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/pengajuan-kartu?${q}`)
  } catch {
    return mockPengajuanSaya()
  }
}

export async function getAntreanValidasi(
  desaSlug: string,
  opts?: { status?: string },
): Promise<{ item: PengajuanKartuItem[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams()
  if (opts?.status) q.set('status', opts.status)
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/pengajuan-kartu${qs ? `?${qs}` : ''}`)
  } catch {
    return mockAntreanValidasi(opts?.status)
  }
}

export async function revisiPengajuan(
  desaSlug: string,
  id: string,
  bukti: Record<string, unknown>,
): Promise<PengajuanKartuItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pengajuan-kartu/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ bukti }),
  })
}

export async function transisiPengajuan(
  desaSlug: string,
  id: string,
  aksi: string,
  catatan = '',
): Promise<PengajuanKartuItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pengajuan-kartu/${id}/transisi`, {
    method: 'POST',
    body: JSON.stringify({ aksi, catatan }),
  })
}

export async function getSertifikasi(
  desaSlug: string,
  subjekTipe: string,
  subjekId: string,
): Promise<SertifikasiItem> {
  const q = new URLSearchParams({ subjek_tipe: subjekTipe, subjek_id: subjekId })
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/sertifikasi?${q}`, { auth: false })
  } catch {
    return mockSertifikasi(subjekId)
  }
}
