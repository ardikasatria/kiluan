import type { KartuAksiItem, MetaPaginasi, PengajuanKartuItem, SertifikasiItem } from './types'

export const MOCK_KARTU: KartuAksiItem[] = [
  {
    id: 1,
    kode: 'pilah_sampah',
    nama: 'Pilah Sampah',
    deskripsi: 'Memilah sampah di usaha',
    kenapa_penting: 'Sampah terpilah mengurangi beban ekosistem pesisir.',
    bukti_dibutuhkan: { foto: true, pernyataan: true },
    bobot: 15,
  },
  {
    id: 2,
    kode: 'hemat_air',
    nama: 'Hemat Air',
    deskripsi: 'Menghemat penggunaan air',
    kenapa_penting: 'Air bersih langka; hemat air = lestari sumber daya.',
    bukti_dibutuhkan: { pernyataan: true },
    bobot: 10,
  },
  {
    id: 3,
    kode: 'edukasi_tamu',
    nama: 'Edukasi Tamu',
    deskripsi: 'Mengedukasi tamu soal konservasi',
    kenapa_penting: 'Tamu yang sadar lingkungan menjaga daya dukung destinasi.',
    bukti_dibutuhkan: { foto: true, pernyataan: true },
    bobot: 20,
  },
  {
    id: 4,
    kode: 'energi_bersih',
    nama: 'Energi Bersih',
    deskripsi: 'Beralih ke sumber energi ramah lingkungan',
    kenapa_penting: 'Energi bersih menurunkan jejak karbon wisata.',
    bukti_dibutuhkan: { foto: true, pernyataan: true },
    bobot: 25,
  },
]

const MOCK_PENGAJUAN: PengajuanKartuItem[] = [
  {
    id: 'pengajuan-mock-1',
    subjek_tipe: 'umkm',
    subjek_id: 'umkm-mock-1',
    kartu: { id: 1, nama: 'Pilah Sampah' },
    bukti: { pernyataan: 'Kami memilah sampah setiap hari.' },
    status: 'menunggu',
    dibuat_pada: new Date().toISOString(),
  },
]

export function mockKartuAksi(): { item: KartuAksiItem[] } {
  return { item: MOCK_KARTU }
}

export function mockPengajuanSaya(): { item: PengajuanKartuItem[]; meta: MetaPaginasi } {
  return {
    item: MOCK_PENGAJUAN.filter((p) => p.status !== 'tervalidasi'),
    meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 },
  }
}

export function mockAntreanValidasi(status?: string): { item: PengajuanKartuItem[]; meta: MetaPaginasi } {
  if (status === 'tervalidasi') {
    return { item: [], meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 } }
  }
  return {
    item: MOCK_PENGAJUAN.filter((p) => p.status === 'menunggu'),
    meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 },
  }
}

export function mockSertifikasi(subjekId: string): SertifikasiItem {
  return {
    subjek_tipe: 'umkm',
    subjek_id: subjekId,
    tingkat: subjekId.includes('2') ? 'bahari' : 'tunas',
    skor: subjekId.includes('2') ? 35 : 15,
    diperbarui_pada: new Date().toISOString(),
  }
}
