import type {
  MisiDetail,
  MisiRingkas,
  PasporDto,
  StasiunLestariDto,
  StempelDto,
  VerifikasiDto,
} from './types'

/** Selaras dengan backend/app/domain/seed_penjelajah.py (Teluk Kiluan). */
const STASIUN_IDS = {
  dermaga: '11111111-1111-4111-8111-111111110001',
  mangrove: '11111111-1111-4111-8111-111111110002',
  pantai: '11111111-1111-4111-8111-111111110003',
} as const

const MOCK_STASIUN: StasiunLestariDto[] = [
  {
    id: STASIUN_IDS.dermaga,
    nama: 'Dermaga Lumba Kiluan',
    tipe: 'dermaga',
    radius_m: 80,
    aktif: true,
    lokasi: { lat: -5.7497, lng: 105.1985 },
    qr_token: 'STN-KILUAN-DERMAGA',
  },
  {
    id: STASIUN_IDS.mangrove,
    nama: 'Titik Tanam Mangrove',
    tipe: 'titik_mangrove',
    radius_m: 100,
    aktif: true,
    lokasi: { lat: -5.751, lng: 105.1995 },
    qr_token: 'STN-KILUAN-MANGROVE',
  },
  {
    id: STASIUN_IDS.pantai,
    nama: 'Pos Bersih Pantai',
    tipe: 'pos',
    radius_m: 100,
    aktif: true,
    lokasi: { lat: -5.7485, lng: 105.197 },
    qr_token: 'STN-KILUAN-PANTAI',
  },
]

const MOCK_MISI: MisiRingkas[] = [
  {
    id: 'seed-bl-lumba',
    kode: 'BL-LUMBA-01',
    judul: 'Etik observasi lumba-lumba',
    jenis: 'belajar',
    kategori: 'lumba',
    poin: 20,
    aktif: true,
  },
  {
    id: 'seed-ak-lumba',
    kode: 'AK-LUMBA-01',
    judul: 'Check-in dermaga lumba',
    jenis: 'aksi',
    kategori: 'lumba',
    poin: 50,
    aktif: true,
    stasiun: { id: STASIUN_IDS.dermaga, nama: 'Dermaga Lumba Kiluan' },
  },
  {
    id: 'seed-bl-mgr',
    kode: 'BL-MGR-01',
    judul: 'Kode etik mangrove',
    jenis: 'belajar',
    kategori: 'mangrove',
    poin: 20,
    aktif: true,
  },
  {
    id: 'seed-ak-mgr',
    kode: 'AK-MGR-01',
    judul: 'Tanam bibit mangrove',
    jenis: 'aksi',
    kategori: 'mangrove',
    poin: 50,
    aktif: true,
    stasiun: { id: STASIUN_IDS.mangrove, nama: 'Titik Tanam Mangrove' },
  },
  {
    id: 'seed-bl-smp',
    kode: 'BL-SMP-01',
    judul: 'Etik bersih pantai',
    jenis: 'belajar',
    kategori: 'sampah',
    poin: 20,
    aktif: true,
  },
  {
    id: 'seed-ak-smp',
    kode: 'AK-SMP-01',
    judul: 'Bersih pantai Kiluan',
    jenis: 'aksi',
    kategori: 'sampah',
    poin: 40,
    aktif: true,
    stasiun: { id: STASIUN_IDS.pantai, nama: 'Pos Bersih Pantai' },
  },
]

const MOCK_DETAIL: Record<string, MisiDetail> = {
  'seed-bl-lumba': {
    ...MOCK_MISI[0],
    deskripsi: 'Micro-lesson wajib sebelum aksi di dermaga.',
    micro_lesson: {
      judul: 'Etik observasi lumba-lumba',
      bagian: [{ judul: 'Jarak aman', isi: 'Minimal 50 meter dari lumba-lumba.' }],
      poin_kunci: ['Jangan memberi makan lumba-lumba', 'Patuhi instruksi pemandu'],
    },
    syarat_verifikasi: { metode: 'otomatis' },
    dampak_template: {},
  },
  'seed-ak-lumba': {
    ...MOCK_MISI[1],
    deskripsi: 'Scan QR STN-KILUAN-DERMAGA + geofence di dermaga.',
    syarat_verifikasi: { metode: 'qr_checkin' },
    dampak_template: { lumba_observasi: 1 },
  },
  'seed-bl-mgr': {
    ...MOCK_MISI[2],
    deskripsi: 'Pelajari kode etik sebelum tanam mangrove.',
    micro_lesson: {
      judul: 'Kode etik mangrove',
      bagian: [{ judul: 'Jangan injak akar', isi: 'Berjalan di jalur yang ditandai.' }],
    },
    syarat_verifikasi: { metode: 'otomatis' },
    dampak_template: {},
  },
  'seed-ak-mgr': {
    ...MOCK_MISI[3],
    deskripsi: 'Tanam bibit — menunggu konfirmasi pemandu.',
    syarat_verifikasi: { metode: 'konfirmasi_pemandu', bukti: { foto: true } },
    dampak_template: { mangrove: 1 },
  },
  'seed-bl-smp': {
    ...MOCK_MISI[4],
    deskripsi: 'Micro-lesson sebelum bersih pantai.',
    micro_lesson: {
      judul: 'Etik bersih pantai',
      bagian: [{ judul: 'Pilah di lapangan', isi: 'Pisahkan plastik dan organik.' }],
    },
    syarat_verifikasi: { metode: 'otomatis' },
    dampak_template: {},
  },
  'seed-ak-smp': {
    ...MOCK_MISI[5],
    deskripsi: 'Foto + geolokasi di pos pantai.',
    syarat_verifikasi: { metode: 'foto_geotag', bukti: { foto: true } },
    dampak_template: { sampah: 2 },
  },
}

/** Lookup detail by ringkas id or by kode (API nyata memakai UUID). */
export function mockDetailMisi(idOrKode: string): { misi: MisiDetail } | null {
  if (MOCK_DETAIL[idOrKode]) return { misi: MOCK_DETAIL[idOrKode] }
  const byKode = MOCK_MISI.find((m) => m.kode === idOrKode || m.id === idOrKode)
  if (byKode && MOCK_DETAIL[byKode.id]) return { misi: MOCK_DETAIL[byKode.id] }
  return null
}

export function mockDaftarMisi(params?: { jenis?: string; kategori?: string }): { item: MisiRingkas[] } {
  let item = MOCK_MISI
  if (params?.jenis) item = item.filter((m) => m.jenis === params.jenis)
  if (params?.kategori) item = item.filter((m) => m.kategori === params.kategori)
  return { item }
}

export function mockStasiun(): { item: StasiunLestariDto[] } {
  return { item: MOCK_STASIUN }
}

export function mockPaspor(): PasporDto {
  return {
    id: 'paspor-demo',
    ringkasan_dampak: {},
    total_stempel: 0,
    diperbarui_pada: new Date().toISOString(),
    stempel: [] satisfies StempelDto[],
  }
}

export function mockVerifikasiAntrean(): { item: VerifikasiDto[] } {
  return { item: [] }
}

/** Token QR dev — sama dengan seed backend Teluk Kiluan. */
export const QR_TOKEN_DEV = {
  dermaga: 'STN-KILUAN-DERMAGA',
  mangrove: 'STN-KILUAN-MANGROVE',
  pantai: 'STN-KILUAN-PANTAI',
} as const
