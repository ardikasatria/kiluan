import { apiFetch } from './client'
import {
  mockDaftarPaket,
  mockDaftarProduk,
  mockDaftarUmkm,
  mockPaketDetail,
  mockPaketKelola,
  mockProdukKelola,
  mockUmkmSaya,
} from './mock-pasar'
import type {
  KurasiLogItem,
  MetaPaginasi,
  PaketDetail,
  PaketRingkas,
  ProdukJasaItem,
  UmkmDetail,
  UmkmRingkas,
} from './types'

export async function getDaftarUmkm(
  desaSlug: string,
  opts?: { bidang?: number; q?: string; dekat?: string; radius_m?: number; kursor?: string; batas?: number },
): Promise<{ item: UmkmRingkas[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams()
  if (opts?.bidang) q.set('bidang', String(opts.bidang))
  if (opts?.q) q.set('q', opts.q)
  if (opts?.dekat) q.set('dekat', opts.dekat)
  if (opts?.radius_m) q.set('radius_m', String(opts.radius_m))
  if (opts?.kursor) q.set('kursor', opts.kursor)
  if (opts?.batas) q.set('batas', String(opts.batas))
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/umkm${qs ? `?${qs}` : ''}`, { auth: false })
  } catch {
    return mockDaftarUmkm(opts?.bidang)
  }
}

export async function getDaftarProduk(
  desaSlug: string,
  opts?: { bidang?: number; umkm_id?: string; q?: string; kursor?: string; batas?: number },
): Promise<{ item: ProdukJasaItem[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams()
  if (opts?.bidang) q.set('bidang', String(opts.bidang))
  if (opts?.umkm_id) q.set('umkm_id', opts.umkm_id)
  if (opts?.q) q.set('q', opts.q)
  if (opts?.kursor) q.set('kursor', opts.kursor)
  if (opts?.batas) q.set('batas', String(opts.batas))
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/produk${qs ? `?${qs}` : ''}`, { auth: false })
  } catch {
    return mockDaftarProduk(opts?.bidang)
  }
}

export async function getDaftarPaket(
  desaSlug: string,
  opts?: { q?: string; kelola?: boolean; status?: string },
): Promise<{ item: PaketRingkas[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams()
  if (opts?.q) q.set('q', opts.q)
  if (opts?.kelola) q.set('kelola', 'true')
  if (opts?.status) q.set('status', opts.status)
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/paket${qs ? `?${qs}` : ''}`, {
      auth: opts?.kelola ?? false,
    })
  } catch {
    return opts?.kelola ? { item: mockPaketKelola(), meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } } : mockDaftarPaket()
  }
}

export async function getPaketDetail(desaSlug: string, id: string, kelola = false): Promise<PaketDetail> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/paket/${id}${kelola ? '?kelola=true' : ''}`, {
      auth: kelola,
    })
  } catch {
    return mockPaketDetail(id)
  }
}

export async function getUmkmKelola(desaSlug: string): Promise<{ item: UmkmRingkas[]; meta: MetaPaginasi }> {
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/umkm?kelola=true`)
  } catch {
    return { item: mockUmkmSaya(), meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } }
  }
}

export async function getProdukKelola(desaSlug: string, umkmId?: string): Promise<{ item: ProdukJasaItem[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams({ kelola: 'true' })
  if (umkmId) q.set('umkm_id', umkmId)
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/produk?${q}`)
  } catch {
    return { item: mockProdukKelola(), meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } }
  }
}

export async function buatUmkm(desaSlug: string, body: Record<string, unknown>): Promise<UmkmDetail> {
  return apiFetch(`/api/v1/desa/${desaSlug}/umkm`, { method: 'POST', body: JSON.stringify(body) })
}

export async function buatProduk(desaSlug: string, body: Record<string, unknown>): Promise<ProdukJasaItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/produk`, { method: 'POST', body: JSON.stringify(body) })
}

export async function ubahStatusProduk(
  desaSlug: string,
  produkId: string,
  status: 'draft' | 'publikasi' | 'arsip',
): Promise<ProdukJasaItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/produk/${produkId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function buatPaket(desaSlug: string, body: Record<string, unknown>): Promise<PaketDetail> {
  return apiFetch(`/api/v1/desa/${desaSlug}/paket`, { method: 'POST', body: JSON.stringify(body) })
}

export async function transisiPaket(
  desaSlug: string,
  paketId: string,
  aksi: string,
  catatan = '',
): Promise<PaketDetail> {
  return apiFetch(`/api/v1/desa/${desaSlug}/paket/${paketId}/transisi`, {
    method: 'POST',
    body: JSON.stringify({ aksi, catatan }),
  })
}

export async function tambahItemPaket(
  desaSlug: string,
  paketId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return apiFetch(`/api/v1/desa/${desaSlug}/paket/${paketId}/item`, { method: 'POST', body: JSON.stringify(body) })
}

export async function verifikasiUmkm(
  desaSlug: string,
  umkmId: string,
  keputusan: 'terverifikasi' | 'ditolak',
): Promise<UmkmDetail> {
  return apiFetch(`/api/v1/desa/${desaSlug}/umkm/${umkmId}/verifikasi`, {
    method: 'PATCH',
    body: JSON.stringify({ keputusan }),
  })
}

export async function getKurasiLog(
  desaSlug: string,
  opts?: { entitas_tipe?: string; entitas_id?: string },
): Promise<{ item: KurasiLogItem[]; meta: MetaPaginasi }> {
  const q = new URLSearchParams()
  if (opts?.entitas_tipe) q.set('entitas_tipe', opts.entitas_tipe)
  if (opts?.entitas_id) q.set('entitas_id', opts.entitas_id)
  const qs = q.toString()
  try {
    return await apiFetch(`/api/v1/desa/${desaSlug}/kurasi/log${qs ? `?${qs}` : ''}`)
  } catch {
    return { item: [], meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } }
  }
}
