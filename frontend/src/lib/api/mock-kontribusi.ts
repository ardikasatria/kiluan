import type { KontribusiItem, MetaPaginasi } from './types'

const MOCK: KontribusiItem[] = [
  {
    id: 'k1',
    tipe: 'foto',
    target_tipe: 'destinasi',
    target_id: 'dest-laguna',
    muatan: { keterangan: 'Pemandangan pagi di teluk' },
    media_id: 'media-1',
    status: 'menunggu',
    penyumbang_id: 'u1',
    dibuat_pada: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'k2',
    tipe: 'tips',
    target_tipe: 'destinasi',
    target_id: 'dest-laguna',
    muatan: { isi: 'Datang sebelum 07:00 untuk spotting lumba-lumba' },
    status: 'menunggu',
    penyumbang_id: 'u1',
    dibuat_pada: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'k3',
    tipe: 'koreksi_data',
    target_tipe: 'destinasi',
    target_id: 'dest-laguna',
    muatan: { field: 'jam_operasional', usulan: '06:00-17:00', alasan: 'Jam resmi desa' },
    status: 'disetujui',
    penyumbang_id: 'u1',
    dibuat_pada: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'k4',
    tipe: 'spot_baru',
    target_tipe: 'desa',
    muatan: { nama: 'Gigi Hiu Barat', deskripsi: 'Spot snorkeling dengan karang sehat' },
    status: 'menunggu',
    penyumbang_id: 'u2',
    dibuat_pada: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'k5',
    tipe: 'ulasan',
    target_tipe: 'destinasi',
    target_id: 'dest-laguna',
    muatan: { isi: 'Pengalaman luar biasa, pemandu ramah dan edukatif.' },
    status: 'menunggu',
    penyumbang_id: 'u2',
    dibuat_pada: new Date(Date.now() - 7200000).toISOString(),
  },
]

export function mockKontribusiSaya(): { item: KontribusiItem[]; meta: MetaPaginasi } {
  return { item: MOCK, meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } }
}

export function mockAntreanKurasi(status?: string): { item: KontribusiItem[]; meta: MetaPaginasi } {
  if (status === 'disetujui') {
    return {
      item: MOCK.filter((k) => k.status === 'disetujui' && (k.tipe === 'koreksi_data' || k.tipe === 'spot_baru')),
      meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 },
    }
  }
  return {
    item: MOCK.filter((k) => k.status === 'menunggu'),
    meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 },
  }
}
