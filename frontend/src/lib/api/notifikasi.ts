import { getAccessToken } from '@/lib/auth/session'
import { ApiError, apiFetch } from './client'
import {
  mockDaftarNotifikasi,
  mockHitungNotifikasi,
  mockTandaiBaca,
  mockTandaiSemuaBaca,
} from './mock-notifikasi'
import type { MetaPaginasi, NotifikasiHitungResponse, NotifikasiItem, StatusNotifikasi } from './types'

export async function getDaftarNotifikasi(
  desaSlug: string,
  opts?: { status?: StatusNotifikasi; kursor?: string; batas?: number },
): Promise<{ item: NotifikasiItem[]; meta: MetaPaginasi }> {
  if (!getAccessToken()) {
    return mockDaftarNotifikasi(opts)
  }
  const q = new URLSearchParams()
  if (opts?.status) q.set('status', opts.status)
  if (opts?.kursor) q.set('kursor', opts.kursor)
  if (opts?.batas) q.set('batas', String(opts.batas))
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/notifikasi${qs ? `?${qs}` : ''}`)
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      return { item: [], meta: { kursor_berikutnya: null, ada_lagi: false, batas: opts?.batas ?? 20 } }
    }
    return mockDaftarNotifikasi(opts)
  }
}

export async function getHitungNotifikasi(desaSlug: string): Promise<NotifikasiHitungResponse> {
  if (!getAccessToken()) {
    return { belum_dibaca: 0 }
  }
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/notifikasi/hitung`)
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      return { belum_dibaca: 0 }
    }
    return mockHitungNotifikasi()
  }
}

export async function tandaiNotifikasiBaca(
  desaSlug: string,
  id: string,
): Promise<NotifikasiItem> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/notifikasi/${id}/baca`, { method: 'POST' })
  } catch {
    const item = mockTandaiBaca(id)
    if (!item) throw new Error('Notifikasi tidak ditemukan')
    return item
  }
}

export async function tandaiSemuaNotifikasiBaca(desaSlug: string): Promise<{ diperbarui: number }> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/notifikasi/baca-semua`, { method: 'POST' })
  } catch {
    return mockTandaiSemuaBaca()
  }
}
