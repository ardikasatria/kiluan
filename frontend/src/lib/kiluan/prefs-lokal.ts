/** Preferensi pengguna yang disimpan di klien sampai endpoint backend tersedia. */

const KUNCI = 'sigerciv:prefs-v1'

export interface NotifikasiPrefs {
  email_misi: boolean
  email_pesanan: boolean
  email_kurasi: boolean
  push_misi: boolean
  push_pesanan: boolean
  push_kurasi: boolean
}

export interface PrefsLokal {
  minat: string[]
  consent_personalisasi: boolean
  bio: string
  bahasa: 'id' | 'en'
  notifikasi: NotifikasiPrefs
  izin_lokasi: boolean
}

const DEFAULT: PrefsLokal = {
  minat: [],
  consent_personalisasi: false,
  bio: '',
  bahasa: 'id',
  notifikasi: {
    email_misi: true,
    email_pesanan: true,
    email_kurasi: false,
    push_misi: true,
    push_pesanan: true,
    push_kurasi: false,
  },
  izin_lokasi: false,
}

function bacaMentah(): PrefsLokal {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(KUNCI)
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...JSON.parse(raw) as Partial<PrefsLokal> }
  } catch {
    return DEFAULT
  }
}

export function bacaPrefsLokal(): PrefsLokal {
  return bacaMentah()
}

export function simpanPrefsLokal(ubah: Partial<PrefsLokal>): PrefsLokal {
  const berikut = { ...bacaMentah(), ...ubah }
  if (typeof window !== 'undefined') {
    localStorage.setItem(KUNCI, JSON.stringify(berikut))
  }
  return berikut
}

export const MINAT_PILIHAN = [
  { id: 'alam', label: 'Alam & pantai', ikon: '🌊' },
  { id: 'budaya', label: 'Budaya lokal', ikon: '🎭' },
  { id: 'kuliner', label: 'Kuliner desa', ikon: '🍲' },
  { id: 'kerajinan', label: 'Kerajinan UMKM', ikon: '🧺' },
  { id: 'misi', label: 'Misi lestari', ikon: '🌱' },
  { id: 'petualangan', label: 'Petualangan', ikon: '⛵' },
  { id: 'keluarga', label: 'Keluarga', ikon: '👨‍👩‍👧' },
  { id: 'fotografi', label: 'Fotografi', ikon: '📷' },
] as const
