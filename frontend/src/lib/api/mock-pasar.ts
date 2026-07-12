import type { MetaPaginasi, PaketDetail, PaketRingkas, ProdukJasaItem, UmkmRingkas } from './types'

const BIDANG = [
  { id: 1, kode: 'kuliner', nama: 'Kuliner' },
  { id: 2, kode: 'kerajinan', nama: 'Kerajinan' },
]

const MOCK_UMKM: UmkmRingkas[] = [
  {
    id: 'umkm-1',
    nama: 'Warung Kopi Kiluan',
    bidang: BIDANG[0],
    status_verifikasi: 'terverifikasi',
    lokasi: { lat: -5.791, lng: 105.103 },
    sertifikasi: { tingkat: 'bahari' },
  },
  {
    id: 'umkm-2',
    nama: 'Anyaman Lestari',
    bidang: BIDANG[1],
    status_verifikasi: 'terverifikasi',
    sertifikasi: { tingkat: 'tunas' },
  },
]

const MOCK_PRODUK: ProdukJasaItem[] = [
  {
    id: 'prod-1',
    umkm: { id: 'umkm-1', nama: 'Warung Kopi Kiluan' },
    nama: 'Kopi Robusta 250g',
    jenis: 'produk',
    deskripsi: 'Biji kopi panggang dari kebun warga',
    harga: 45000,
    satuan_harga: 'per_unit',
    stok: 20,
    status: 'publikasi',
    media: [],
  },
  {
    id: 'prod-2',
    umkm: { id: 'umkm-2', nama: 'Anyaman Lestari' },
    nama: 'Tas anyaman pandan',
    jenis: 'produk',
    harga: 85000,
    satuan_harga: 'per_unit',
    stok: 5,
    status: 'publikasi',
    media: [],
  },
]

const MOCK_PAKET: PaketRingkas[] = [
  {
    id: 'pkt-1',
    slug: 'trip-lumba',
    nama: 'Trip Lumba-Lumba',
    agen: { id: 'agen-1', nama: 'Kiluan Explorer' },
    durasi_jam: 30,
    harga: 750000,
    satuan_harga: 'per_paket',
    kuota_default: 8,
    status: 'publikasi',
    media_utama: null,
  },
  {
    id: 'pkt-snorkel',
    slug: 'snorkel-pagi',
    nama: 'Snorkel Pagi',
    agen: { id: 'agen-1', nama: 'Kiluan Explorer' },
    durasi_jam: 6,
    harga: 350000,
    satuan_harga: 'per_paket',
    kuota_default: 10,
    status: 'publikasi',
    media_utama: null,
  },
]

export function mockDaftarUmkm(bidang?: number): { item: UmkmRingkas[]; meta: MetaPaginasi } {
  let item = MOCK_UMKM
  if (bidang) item = item.filter((u) => u.bidang.id === bidang)
  return { item, meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } }
}

export function mockDaftarProduk(bidang?: number): { item: ProdukJasaItem[]; meta: MetaPaginasi } {
  let item = MOCK_PRODUK
  if (bidang) {
    const ids = new Set(MOCK_UMKM.filter((u) => u.bidang.id === bidang).map((u) => u.id))
    item = item.filter((p) => ids.has(p.umkm.id))
  }
  return { item, meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } }
}

export function mockDaftarPaket(): { item: PaketRingkas[]; meta: MetaPaginasi } {
  return { item: MOCK_PAKET, meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } }
}

export function mockPaketDetail(id: string): PaketDetail {
  const p = MOCK_PAKET.find((x) => x.id === id || x.slug === id) ?? MOCK_PAKET[0]
  return {
    ...p,
    deskripsi: 'Perjalanan melihat lumba-lumba di Teluk Kiluan',
    item: [
      { id: 'i1', hari: 1, urutan: 1, judul: 'Berkumpul di dermaga', durasi_menit: 30 },
      { id: 'i2', hari: 1, urutan: 2, judul: 'Snorkeling', durasi_menit: 90 },
    ],
  }
}

export function mockUmkmSaya(): UmkmRingkas[] {
  return [{ ...MOCK_UMKM[0], status_verifikasi: 'terverifikasi' }]
}

export function mockProdukKelola(): ProdukJasaItem[] {
  return [
    ...MOCK_PRODUK,
    {
      id: 'prod-draft',
      umkm: { id: 'umkm-1', nama: 'Warung Kopi Kiluan' },
      nama: 'Kopi celup (draft)',
      jenis: 'produk',
      harga: 25000,
      satuan_harga: 'per_unit',
      status: 'draft',
      media: [],
    },
  ]
}

export function mockPaketKelola(): PaketRingkas[] {
  return [
    ...MOCK_PAKET,
    {
      id: 'pkt-2',
      slug: 'snorkel-pagi',
      nama: 'Snorkel Pagi',
      agen: { id: 'agen-1', nama: 'Kiluan Explorer' },
      durasi_jam: 6,
      harga: 350000,
      satuan_harga: 'per_paket',
      kuota_default: 10,
      status: 'draft',
      media_utama: null,
    },
    {
      id: 'pkt-3',
      slug: 'trip-review',
      nama: 'Trip Review',
      agen: { id: 'agen-1', nama: 'Kiluan Explorer' },
      durasi_jam: 12,
      harga: 500000,
      satuan_harga: 'per_paket',
      kuota_default: 6,
      status: 'review',
      media_utama: null,
    },
  ]
}
