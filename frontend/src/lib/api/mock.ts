import type {
  CuacaResponse,
  DesaRingkas,
  DestinasiLengkap,
  DestinasiRingkas,
  KalenderItem,
  LayananItem,
  MetaPaginasi,
  ProfilDesa,
} from './types'
import type { DiscoveryParams } from './types'

const KILUAN_LOK = { lat: -5.7912, lng: 105.1033 }

export const MOCK_PROFIL: ProfilDesa = {
  id: 'd1000001-0000-4000-8000-000000000001',
  slug: 'teluk-kiluan',
  nama: 'Teluk Kiluan',
  deskripsi:
    'Desa wisata bahari di Tanggamus, Lampung — rumah bagi lumba-lumba, snorkeling, dan komunitas yang merawat laut.',
  lokasi: KILUAN_LOK,
  provinsi: 'Lampung',
  kabupaten: 'Tanggamus',
  kecamatan: 'Kelumbayan',
  pekon: 'Kiluan Negeri',
  warna_primer: '#215B63',
}

const SPOTS: DestinasiLengkap[] = [
  {
    id: 'a1000001-0000-4000-8000-000000000001',
    slug: 'gigi-hiu',
    nama: 'Pantai Gigi Hiu',
    kategori_id: 2,
    lokasi: { lat: -5.7912, lng: 105.1033 },
    status: 'publikasi',
    alamat: 'Pekon Kiluan Negeri',
    deskripsi:
      'Formasi batu granit berbentuk gigi hiu yang ikonik. Spot favorit untuk foto dan menikmati sunset.',
    jam_operasional: { sen: '06:00-18:00', min: '06:00-18:00' },
    tag: [{ id: 1, kode: 'ramah-keluarga', nama: 'Ramah Keluarga' }],
    media: [],
    layanan: [
      {
        id: 'b1000001-0000-4000-8000-000000000001',
        nama: 'Perahu lumba-lumba pagi',
        jenis: 'transportasi',
        harga: 350000,
        satuan_harga: 'per_paket',
        status: 'publikasi',
        destinasi_id: 'a1000001-0000-4000-8000-000000000001',
      },
    ],
    kalender: [
      {
        id: 'c1000001-0000-4000-8000-000000000001',
        judul: 'Lumba-lumba pagi',
        tipe: 'harian',
        destinasi_id: 'a1000001-0000-4000-8000-000000000001',
        waktu_mulai: '05:30',
        waktu_selesai: '07:00',
        pengulangan: { freq: 'DAILY' },
        berlaku_mulai: '2025-06-01',
        status: 'aktif',
      },
    ],
    kategori: { id: 2, kode: 'pantai', nama: 'Pantai' },
  },
  {
    id: 'a1000001-0000-4000-8000-000000000002',
    slug: 'laguna-kiluan',
    nama: 'Laguna Kiluan',
    kategori_id: 1,
    lokasi: { lat: -5.788, lng: 105.098 },
    status: 'publikasi',
    alamat: 'Teluk Kiluan',
    deskripsi: 'Perairan tenang untuk snorkeling dan berenang dekat pantai.',
    tag: [{ id: 2, kode: 'snorkeling', nama: 'Snorkeling' }],
    media: [],
    layanan: [],
    kalender: [],
    kategori: { id: 1, kode: 'snorkeling', nama: 'Snorkeling' },
  },
]

export function mockProfilDesa(slug: string): ProfilDesa | null {
  if (slug === 'teluk-kiluan') return MOCK_PROFIL
  return null
}

export function mockDestinasiList(slug: string, publikOnly = true): DestinasiRingkas[] {
  if (slug !== 'teluk-kiluan') return []
  return SPOTS.filter((s) => !publikOnly || s.status === 'publikasi').map((s) => ({
    id: s.id,
    slug: s.slug,
    nama: s.nama,
    kategori_id: s.kategori_id,
    lokasi: s.lokasi,
    status: s.status,
    alamat: s.alamat,
    desa_slug: slug,
  }))
}

export function mockDestinasiDetail(slug: string, idOrSlug: string): DestinasiLengkap | null {
  if (slug !== 'teluk-kiluan') return null
  return SPOTS.find((s) => s.id === idOrSlug || s.slug === idOrSlug) ?? null
}

export function mockCuaca(): CuacaResponse {
  return {
    darat: {
      status: 'ok',
      prakiraan: [
        { t: 28, hu: 82, ws: 12, wd: 'SW', weather_desc: 'Cerah Berawan', local_datetime: '2025-07-08 14:00' },
      ],
      diperbarui: new Date().toISOString(),
    },
    maritim: {
      status: 'ok',
      kode: 'S.18.3',
      perairan: {
        tinggi_gelombang: '0.5–1.25 m',
        angin: '10–20 kt dari SW',
        keterangan: 'Gelombang rendah–sedang',
      },
      diperbarui: new Date().toISOString(),
    },
    sumber: 'BMKG',
    diperbarui: new Date().toISOString(),
  }
}

export function mockLayanan(slug: string): LayananItem[] {
  if (slug !== 'teluk-kiluan') return []
  return SPOTS.flatMap((s) => s.layanan)
}

export function mockKalender(slug: string): KalenderItem[] {
  if (slug !== 'teluk-kiluan') return []
  return SPOTS.flatMap((s) => s.kalender)
}

export function mockDaftarDesa(params?: Omit<DiscoveryParams, 'desa' | 'kategori' | 'tag'>): {
  item: DesaRingkas[]
  meta: MetaPaginasi
} {
  let item: DesaRingkas[] = [
    {
      slug: MOCK_PROFIL.slug,
      nama: MOCK_PROFIL.nama,
      deskripsi: MOCK_PROFIL.deskripsi,
      lokasi: MOCK_PROFIL.lokasi,
    },
  ]
  if (params?.q) {
    const ql = params.q.toLowerCase()
    item = item.filter((d) => d.nama.toLowerCase().includes(ql) || d.slug.includes(ql))
  }
  const batas = params?.batas ?? 20
  return {
    item: item.slice(0, batas),
    meta: { kursor_berikutnya: null, ada_lagi: item.length > batas, batas },
  }
}

export function mockDestinasiDiscovery(params?: DiscoveryParams): {
  item: DestinasiRingkas[]
  meta: MetaPaginasi
} {
  let item = mockDestinasiList('teluk-kiluan', true)
  if (params?.desa && params.desa !== 'teluk-kiluan') {
    item = []
  }
  if (params?.kategori != null) {
    item = item.filter((d) => d.kategori_id === params.kategori)
  }
  if (params?.q) {
    const ql = params.q.toLowerCase()
    item = item.filter((d) => d.nama.toLowerCase().includes(ql))
  }
  const batas = params?.batas ?? 20
  return {
    item: item.slice(0, batas),
    meta: { kursor_berikutnya: null, ada_lagi: item.length > batas, batas },
  }
}
