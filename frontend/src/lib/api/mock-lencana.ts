import type { MetaPaginasi, PoinSayaResponse } from './types'

const MOCK_BADGES = [
  {
    id: 1,
    kode: 'penjelajah',
    nama: 'Penjelajah',
    deskripsi: 'Kontribusi pertama',
    ikon: '🧭',
    tingkat: 1,
    syarat: { poin_min: 20 },
  },
  {
    id: 2,
    kode: 'kurator_warga',
    nama: 'Kurator Warga',
    deskripsi: '10 kontribusi disetujui',
    ikon: '⭐',
    tingkat: 2,
    syarat: { aksi: 'kontribusi_disetujui', jumlah: 10 },
  },
  {
    id: 3,
    kode: 'pelopor',
    nama: 'Pelopor',
    deskripsi: '50 poin di desa',
    ikon: '🏅',
    tingkat: 3,
    syarat: { poin_min: 50 },
  },
]

let mockRiwayatSeq = 0

export function mockBadgeKatalog() {
  return MOCK_BADGES
}

export function mockBadgeSaya() {
  return [
    {
      ...MOCK_BADGES[0],
      diperoleh_pada: new Date().toISOString(),
    },
  ]
}

export function mockPoinSaya(kursor?: string): PoinSayaResponse {
  const semua = Array.from({ length: 5 }, (_, i) => {
    mockRiwayatSeq += 1
    return {
      kode_aksi: i % 2 === 0 ? 'kontribusi_disetujui' : 'produk_terdaftar',
      poin: i % 2 === 0 ? 20 : 10,
      referensi_tipe: i % 2 === 0 ? 'kontribusi' : 'produk_jasa',
      referensi_id: `mock-ref-${mockRiwayatSeq}`,
      dibuat_pada: new Date(Date.now() - i * 86400000).toISOString(),
    }
  })
  const offset = kursor ? 2 : 0
  const slice = semua.slice(offset, offset + 2)
  const meta: MetaPaginasi = {
    kursor_berikutnya: offset + 2 < semua.length ? 'mock-cursor' : null,
    ada_lagi: offset + 2 < semua.length,
    batas: 2,
  }
  return { saldo: 30, riwayat: slice, meta }
}

export function mockLeaderboard(periode: string) {
  const faktor = periode === '7h' ? 0.6 : periode === '30h' ? 0.85 : 1
  return [
    {
      peringkat: 1,
      pengguna: { id: '1', nama: 'Sari Kontributor', avatar: null },
      poin: Math.round(120 * faktor),
      badge_teratas: { kode: 'pelopor', nama: 'Pelopor', ikon: '🏅' },
    },
    {
      peringkat: 2,
      pengguna: { id: '2', nama: 'Budi Wisatawan', avatar: null },
      poin: Math.round(80 * faktor),
      badge_teratas: { kode: 'penjelajah', nama: 'Penjelajah', ikon: '🧭' },
    },
    {
      peringkat: 3,
      pengguna: { id: '3', nama: 'Ani Relawan', avatar: null },
      poin: Math.round(45 * faktor),
      badge_teratas: null,
    },
  ]
}
