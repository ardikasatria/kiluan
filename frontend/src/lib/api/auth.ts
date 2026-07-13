import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth/session'
import { normalisasiPeranKeanggotaan } from '@/lib/kiluan/peran'
import { apiFetch } from './client'

export interface MasukPayload {
  email: string
  kata_sandi: string
}

export interface DaftarPayload {
  email: string
  nama: string
  kata_sandi: string
  telepon?: string
}

export interface MasukResponse {
  access_token: string
  tipe: string
  kedaluwarsa_dalam: number
  pengguna_id: string
}

export interface KeanggotaanSaya {
  desa_id: string | null
  peran: string
  status: string
}

export interface ProfilSaya {
  id: string
  nama: string
  email: string
  telepon?: string | null
  status: string
  email_terverifikasi?: boolean
  avatar_url?: string | null
  avatar_media_id?: string | null
  keanggotaan: KeanggotaanSaya[]
}

export interface PatchProfilPayload {
  nama?: string
  telepon?: string
  avatar_media_id?: string
}

// Kontributor = peran gabungan (kontribusi + pengelola desa).
const PERAN_PENGELOLA = new Set(['kontributor', 'perangkat_desa', 'admin'])

export function adalahPengelola(profil: ProfilSaya | null): boolean {
  if (!profil) return false
  return profil.keanggotaan.some(
    (k) => k.status === 'aktif' && PERAN_PENGELOLA.has(normalisasiPeranKeanggotaan(k.peran)),
  )
}

export async function masuk(payload: MasukPayload): Promise<MasukResponse> {
  const res = await apiFetch<MasukResponse>('/api/v1/auth/masuk', {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
    credentials: 'include',
  })
  setAccessToken(res.access_token)
  return res
}

export async function daftar(payload: DaftarPayload) {
  return apiFetch<{ pengguna: { id: string; email: string; nama: string; status: string }; pesan: string }>(
    '/api/v1/auth/daftar',
    { method: 'POST', body: JSON.stringify(payload), auth: false },
  )
}

export async function verifikasiEmail(email: string, kode: string) {
  return apiFetch<{ status: string }>('/api/v1/auth/verifikasi-email', {
    method: 'POST',
    body: JSON.stringify({ email, kode }),
    auth: false,
  })
}

export async function kirimUlangVerifikasi(email: string) {
  return apiFetch<{ pesan: string }>('/api/v1/auth/kirim-ulang-verifikasi', {
    method: 'POST',
    body: JSON.stringify({ email }),
    auth: false,
  })
}

export async function segarkanToken(): Promise<string> {
  const res = await apiFetch<MasukResponse>('/api/v1/auth/segarkan', {
    method: 'POST',
    auth: false,
    credentials: 'include',
  })
  setAccessToken(res.access_token)
  return res.access_token
}

export async function keluar(): Promise<void> {
  try {
    await apiFetch<void>('/api/v1/auth/keluar', {
      method: 'POST',
      auth: false,
      credentials: 'include',
    })
  } finally {
    clearAccessToken()
  }
}

export async function getProfilSaya(): Promise<ProfilSaya> {
  return apiFetch<ProfilSaya>('/api/v1/saya')
}

export async function patchProfilSaya(payload: PatchProfilPayload): Promise<ProfilSaya> {
  return apiFetch<ProfilSaya>('/api/v1/saya', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function bootstrapSesi(): Promise<ProfilSaya | null> {
  const token = getAccessToken()
  if (token) {
    try {
      return await getProfilSaya()
    } catch {
      /* coba refresh */
    }
  }
  try {
    await segarkanToken()
    return await getProfilSaya()
  } catch {
    clearAccessToken()
    return null
  }
}

/** Pastikan access token ada — segarkan dari cookie bila perlu. */
export async function pastikanTokenAkses(): Promise<string> {
  const ada = getAccessToken()
  if (ada) return ada
  return segarkanToken()
}
