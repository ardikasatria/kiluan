import type { ProfilSaya } from '@/lib/api/auth'
import { punyaPeran, punyaPeranDiDesa, type PeranKode } from '@/lib/kiluan/peran'

export const PERAN_BENDAHARA: PeranKode[] = ['pokdarwis', 'perangkat_desa', 'admin']

/** Pengelola konten desa (CRUD destinasi, kurasi, dll.). */
export const PERAN_PENGELOLA_KONTEN: PeranKode[] = ['pokdarwis', 'perangkat_desa', 'admin']

/** Penyedia Dermaga — pesanan & pendapatan milik sendiri. */
export const PERAN_PENYEDIA_DERMAGA: PeranKode[] = ['umkm', 'agen']

/** Check-in & slot paket wisata. */
export const PERAN_VERIFIKATOR_DERMAGA: PeranKode[] = ['agen', 'pokdarwis', 'perangkat_desa', 'admin']

export const PERAN_KELOLA: PeranKode[] = ['pokdarwis', 'perangkat_desa', 'admin', 'umkm', 'agen']

export function punyaSalahSatuPeran(
  profil: ProfilSaya | null,
  kode: readonly PeranKode[],
  desaId?: string | null,
): boolean {
  return kode.some((k) => punyaPeranDiDesa(profil, k, desaId))
}

export function adalahBendahara(profil: ProfilSaya | null, desaId?: string | null): boolean {
  return punyaSalahSatuPeran(profil, PERAN_BENDAHARA, desaId)
}

export function adalahPengelolaKonten(profil: ProfilSaya | null, desaId?: string | null): boolean {
  return punyaSalahSatuPeran(profil, PERAN_PENGELOLA_KONTEN, desaId)
}

export function adalahPenyediaDermaga(profil: ProfilSaya | null, desaId?: string | null): boolean {
  return punyaSalahSatuPeran(profil, PERAN_PENYEDIA_DERMAGA, desaId)
}

export function adalahVerifikatorDermaga(profil: ProfilSaya | null, desaId?: string | null): boolean {
  return punyaSalahSatuPeran(profil, PERAN_VERIFIKATOR_DERMAGA, desaId)
}

/** Minimal satu peran yang boleh masuk area /kelola. */
export function bisaMasukKelola(profil: ProfilSaya | null, desaId?: string | null): boolean {
  if (!profil) return false
  if (punyaPeran(profil, 'admin')) return true
  if (!desaId) {
    return (
      adalahPengelolaKonten(profil) ||
      adalahPenyediaDermaga(profil) ||
      adalahVerifikatorDermaga(profil)
    )
  }
  return PERAN_KELOLA.some((p) => p !== 'admin' && punyaPeranDiDesa(profil, p, desaId))
}

/** Hanya UMKM/agen tanpa peran pengelola/bendahara. */
export function hanyaPenyediaDermaga(profil: ProfilSaya | null, desaId?: string | null): boolean {
  return adalahPenyediaDermaga(profil, desaId) && !adalahPengelolaKonten(profil, desaId)
}

/** Segmen path relatif setelah `/kelola/` (kosong = ringkasan). */
export function segmenKelola(pathname: string): string {
  const i = pathname.indexOf('/kelola')
  if (i < 0) return ''
  const rest = pathname.slice(i + '/kelola'.length).replace(/^\//, '')
  return rest.split('/')[0] ?? ''
}

/** Peran yang diizinkan per tab navigasi kelola. */
export const NAV_Kelola_AKSES: Record<string, readonly PeranKode[]> = {
  '': PERAN_PENGELOLA_KONTEN,
  destinasi: PERAN_PENGELOLA_KONTEN,
  layanan: PERAN_PENGELOLA_KONTEN,
  kalender: PERAN_PENGELOLA_KONTEN,
  berita: PERAN_PENGELOLA_KONTEN,
  kurasi: PERAN_PENGELOLA_KONTEN,
  'kurasi-konten': PERAN_PENGELOLA_KONTEN,
  'kurasi-paket': PERAN_PENGELOLA_KONTEN,
  'validasi-kartu': PERAN_PENGELOLA_KONTEN,
  keanggotaan: PERAN_PENGELOLA_KONTEN,
  umkm: PERAN_PENGELOLA_KONTEN,
  misi: PERAN_PENGELOLA_KONTEN,
  stasiun: PERAN_PENGELOLA_KONTEN,
  poin: PERAN_PENGELOLA_KONTEN,
  verifikasi: PERAN_PENGELOLA_KONTEN,
  hadiah: PERAN_PENGELOLA_KONTEN,
  kupon: PERAN_PENGELOLA_KONTEN,
  slot: PERAN_VERIFIKATOR_DERMAGA,
  pesanan: [...PERAN_PENYEDIA_DERMAGA, ...PERAN_BENDAHARA],
  checkin: PERAN_VERIFIKATOR_DERMAGA,
  pendapatan: [...PERAN_PENYEDIA_DERMAGA, ...PERAN_BENDAHARA],
  bendahara: PERAN_BENDAHARA,
  pembayaran: PERAN_BENDAHARA,
  payout: PERAN_BENDAHARA,
  transaksi: PERAN_BENDAHARA,
  refund: PERAN_BENDAHARA,
  pengaturan: PERAN_BENDAHARA,
}

export function bolehAksesSegmenKelola(
  profil: ProfilSaya | null,
  segmen: string,
  desaId?: string | null,
): boolean {
  const izin = NAV_Kelola_AKSES[segmen]
  if (!izin) return adalahPengelolaKonten(profil, desaId)
  return punyaSalahSatuPeran(profil, izin, desaId)
}

export function navKelolaTerlihat(
  profil: ProfilSaya | null,
  navKey: string,
  desaId?: string | null,
): boolean {
  const href = navKey === 'ringkasan' ? '' : navKey === 'validasiKartu' ? 'validasi-kartu' : navKey
  return bolehAksesSegmenKelola(profil, href, desaId)
}
