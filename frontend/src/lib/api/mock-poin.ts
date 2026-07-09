import type { HadiahDto, KuponRingkas, MetaPaginasi, PenukaranDto } from './types'

const MOCK_HADIAH: HadiahDto[] = [
  {
    id: 'hadiah-1',
    kode: 'KAOS-LUMBA',
    nama: 'Kaos Lumba-Lumba',
    deskripsi: 'Merchandise edisi terbatas',
    jenis: 'merchandise',
    biaya_poin: 100,
    stok: 20,
    syarat: {},
    aktif: true,
  },
  {
    id: 'hadiah-2',
    kode: 'KUPON-10',
    nama: 'Kupon diskon 10%',
    deskripsi: 'Tukar poin jadi kupon checkout',
    jenis: 'kupon_diskon',
    biaya_poin: 150,
    stok: null,
    syarat: { tingkat_min: 'tunas' },
    aktif: true,
  },
]

const MOCK_KUPON: KuponRingkas[] = [
  {
    id: 'kupon-mock',
    kode: 'PROMO25',
    sumber: 'kampanye',
    tipe_diskon: 'nominal',
    nilai: 25000,
    min_belanja: 50000,
    batas_pakai: 100,
    terpakai: 0,
    status: 'aktif',
    penyedia_terbatas: null,
    pemilik_id: null,
  },
]

export function mockHadiah(): { item: HadiahDto[] } {
  return { item: MOCK_HADIAH }
}

export function mockKuponSaya(): { item: KuponRingkas[] } {
  return { item: MOCK_KUPON }
}

export function mockPenukaran(): { item: PenukaranDto[]; meta: MetaPaginasi } {
  return { item: [], meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } }
}
