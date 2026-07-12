/** Segmen URL level-1 yang bukan slug desa wisata (setelah locale). */
export const SEGMEN_RUTE_GLOBAL = new Set([
  'admin',
  'cari',
  'daftar',
  'dasbor',
  'dashboard',
  'gabung',
  'jelajah',
  'lupa-sandi',
  'masuk',
  'paspor',
  'saya',
  'submission',
  'verifikasi-email',
  // Legacy / template NCMagazine
  'about',
  'author',
  'category',
  'contact',
  'forgot-password',
  'home-2',
  'home-3',
  'home-4',
  'home-5',
  'home-6',
  'login',
  'post',
  'reset-password',
  'search',
  'search-2',
  'signup',
  'subscription',
  'tag',
])

export function isSegmenRuteGlobal(segmen: string | undefined): boolean {
  return !segmen || SEGMEN_RUTE_GLOBAL.has(segmen)
}
