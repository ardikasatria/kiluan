import type { PeranKode } from './peran'

/** Keluarga UI dasbor — 5 kartu pemilih, bukan 7 peran teknis. */
export type KeluargaDasborHub =
  | 'konsumen'
  | 'pengelola_desa'
  | 'penyedia_ekonomi'
  | 'mitra_dampak'
  | 'tata_kelola'

export const URUTAN_KELUARGA_DASBOR: KeluargaDasborHub[] = [
  'konsumen',
  'pengelola_desa',
  'penyedia_ekonomi',
  'mitra_dampak',
  'tata_kelola',
]

const PERAN_KE_KELUARGA: Partial<Record<PeranKode, KeluargaDasborHub>> = {
  wisatawan: 'konsumen',
  kontributor: 'pengelola_desa',
  umkm: 'penyedia_ekonomi',
  agen: 'penyedia_ekonomi',
  organisasi: 'mitra_dampak',
  perangkat_desa: 'tata_kelola',
}

export interface KartuKeluargaDasbor {
  id: KeluargaDasborHub
  /** Peran aktif pengguna dalam keluarga ini (1–2 untuk penyedia ekonomi). */
  peran: PeranKode[]
}

/** Kelompokkan peran aktif menjadi maks. 5 kartu keluarga UI. */
export function kelompokkanPeranDasborHub(peranAktif: PeranKode[]): KartuKeluargaDasbor[] {
  const bucket = new Map<KeluargaDasborHub, PeranKode[]>()

  for (const k of peranAktif) {
    if (k === 'admin') continue
    const keluarga = PERAN_KE_KELUARGA[k]
    if (!keluarga) continue
    const list = bucket.get(keluarga) ?? []
    list.push(k)
    bucket.set(keluarga, list)
  }

  return URUTAN_KELUARGA_DASBOR.filter((id) => bucket.has(id)).map((id) => ({
    id,
    peran: bucket.get(id)!,
  }))
}
