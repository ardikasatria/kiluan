/** Akun demo lokal — sinkron dengan backend/app/domain/seed_demo_akun.py */
export const DEMO_SANDI = 'demo-kiluan'

export type DemoAkunItem = {
  kode: string
  email: string
  labelKey: string
}

export const DEMO_AKUN: DemoAkunItem[] = [
  { kode: 'wisatawan', email: 'demo-wisatawan@kiluan.local', labelKey: 'wisatawan' },
  { kode: 'kontributor', email: 'demo-kontributor@kiluan.local', labelKey: 'kontributor' },
  { kode: 'perangkat_desa', email: 'demo-perangkat@kiluan.local', labelKey: 'perangkatDesa' },
  { kode: 'umkm', email: 'demo-umkm@kiluan.local', labelKey: 'umkm' },
  { kode: 'agen', email: 'demo-agen@kiluan.local', labelKey: 'agen' },
  { kode: 'organisasi', email: 'demo-organisasi@kiluan.local', labelKey: 'organisasi' },
]

export const ADMIN_DEMO = {
  email: 'admin@kiluan.local',
  sandi: 'ubah-saya',
  labelKey: 'admin',
} as const

export function tampilkanPanelDemoAkun(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_AKUN === 'true'
}
