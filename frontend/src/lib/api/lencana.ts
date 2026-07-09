import { apiFetch } from './client'
import {
  mockBadgeKatalog,
  mockBadgeSaya,
  mockLeaderboard,
  mockPoinSaya,
} from './mock-lencana'
import type {
  AturanPoinItem,
  BadgeItem,
  BadgeMilik,
  BidangUsaha,
  LeaderboardEntry,
  PoinSayaResponse,
} from './types'

export type PeriodeLeaderboard = 'all' | '7h' | '30h'

export async function getPoinSaya(
  desaSlug: string,
  opts?: { kursor?: string; batas?: number },
): Promise<PoinSayaResponse> {
  const q = new URLSearchParams()
  if (opts?.kursor) q.set('kursor', opts.kursor)
  if (opts?.batas) q.set('batas', String(opts.batas))
  const qs = q.toString()
  try {
    return await apiFetch<PoinSayaResponse>(
      `/api/v1/desa/${desaSlug}/poin/saya${qs ? `?${qs}` : ''}`,
    )
  } catch {
    return mockPoinSaya(opts?.kursor)
  }
}

export async function getKatalogBadge(desaSlug: string): Promise<BadgeItem[]> {
  try {
    const res = await apiFetch<{ item: BadgeItem[] }>(`/api/v1/desa/${desaSlug}/badge`, {
      auth: false,
    })
    return res.item
  } catch {
    return mockBadgeKatalog()
  }
}

export async function getBadgeSaya(desaSlug: string): Promise<BadgeMilik[]> {
  try {
    const res = await apiFetch<{ item: BadgeMilik[] }>(`/api/v1/desa/${desaSlug}/badge/saya`)
    return res.item
  } catch {
    return mockBadgeSaya()
  }
}

export async function getLeaderboard(
  desaSlug: string,
  periode: PeriodeLeaderboard = 'all',
  batas = 20,
): Promise<LeaderboardEntry[]> {
  const q = new URLSearchParams({ periode, batas: String(batas) })
  try {
    const res = await apiFetch<{ item: LeaderboardEntry[] }>(
      `/api/v1/desa/${desaSlug}/leaderboard?${q}`,
      { auth: false },
    )
    return res.item
  } catch {
    return mockLeaderboard(periode)
  }
}

export async function getAturanPoin(desaSlug: string): Promise<AturanPoinItem[]> {
  try {
    const res = await apiFetch<{ item: AturanPoinItem[] }>(
      `/api/v1/desa/${desaSlug}/aturan-poin`,
      { auth: false },
    )
    return res.item
  } catch {
    return [
      { kode_aksi: 'kontribusi_disetujui', poin: 20, deskripsi: 'Kontribusi disetujui', aktif: true },
      { kode_aksi: 'produk_terdaftar', poin: 10, deskripsi: 'Produk terdaftar', aktif: true },
    ]
  }
}

export async function getBidangUsaha(): Promise<BidangUsaha[]> {
  try {
    const res = await apiFetch<{ item: BidangUsaha[] }>('/api/v1/bidang-usaha', { auth: false })
    return res.item
  } catch {
    return [
      { id: 1, kode: 'kuliner', nama: 'Kuliner', ikon: '🍲' },
      { id: 2, kode: 'kerajinan', nama: 'Kerajinan', ikon: '🧺' },
    ]
  }
}
