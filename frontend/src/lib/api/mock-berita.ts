import type { BeritaDetail, BeritaRingkas, KategoriBerita, MetaPaginasi } from './types'

const TAG = [
  { id: 1, kode: 'konservasi', nama: 'Konservasi' },
  { id: 2, kode: 'komunitas', nama: 'Komunitas' },
]

const MOCK_BERITA: BeritaDetail[] = [
  {
    id: 'brt-1',
    slug: 'musim-lumba-lumba-2026',
    judul: 'Musim Lumba-Lumba 2026 Resmi Dibuka',
    ringkasan: 'Panduan etika berkunjung dan jadwal trip pagi untuk musim ini.',
    konten:
      '## Selamat datang di musim baru\n\nMusim **lumba-lumba** Teluk Kiluan dimulai. Pastikan mengikuti kode etik:\n\n- Jarak aman minimal 50 m\n- Tidak memberi makan\n- Ikuti arahan pemandu lokal\n\n> Wisata lestari dimulai dari sikap kita di laut.',
    kategori: 'pengumuman',
    sampul: { url: null },
    sorotan: true,
    terbit_pada: '2026-01-15T06:00:00Z',
    tag: [TAG[0]],
    penulis: { nama: 'Organisasi Kiluan' },
    status: 'publikasi',
    dibuat_pada: '2026-01-10T08:00:00Z',
    diperbarui_pada: '2026-01-14T10:00:00Z',
  },
  {
    id: 'brt-2',
    slug: 'cerita-nelayan-ramli',
    judul: 'Cerita Nelayan Ramli: Generasi ke Generasi',
    ringkasan: 'Wawancara singkat dengan nelayan lokal tentang tradisi dan konservasi.',
    konten:
      'Ramli sudah **40 tahun** mengarungi perairan Kiluan.\n\n"Kalau laut sehat, desa hidup," katanya sambil memperbaiki jaring.\n\nKunjungi warung kopi di dermaga untuk mendengar cerita lengkapnya.',
    kategori: 'cerita',
    sampul: { url: null },
    sorotan: false,
    terbit_pada: '2026-02-01T09:00:00Z',
    tag: [TAG[1]],
    penulis: { nama: 'Tim Warta' },
    status: 'publikasi',
    dibuat_pada: '2026-01-28T12:00:00Z',
  },
  {
    id: 'brt-3',
    slug: 'draft-rencana-mangrove',
    judul: '[Draft] Rencana Penanaman Mangrove',
    ringkasan: 'Dokumen internal — belum dipublikasikan.',
    konten: 'Konten draft untuk review pengelola.',
    kategori: 'konservasi',
    sampul: null,
    sorotan: false,
    terbit_pada: null,
    tag: [],
    penulis: { nama: 'Perangkat Desa' },
    status: 'draft',
    dibuat_pada: '2026-03-01T07:00:00Z',
  },
]

function filterPublik(item: BeritaDetail): boolean {
  if (item.status !== 'publikasi' || item.dihapus_pada) return false
  if (item.terbit_pada) return new Date(item.terbit_pada) <= new Date()
  return true
}

export function mockDaftarBerita(opts?: {
  kategori?: KategoriBerita
  tag?: string
  sorotan?: boolean
  status?: string
  kelola?: boolean
}): { item: BeritaRingkas[]; meta: MetaPaginasi } {
  let item = [...MOCK_BERITA]
  if (!opts?.kelola) {
    item = item.filter(filterPublik)
  } else if (opts.status) {
    item = item.filter((b) => b.status === opts.status)
  }
  if (opts?.kategori) item = item.filter((b) => b.kategori === opts.kategori)
  if (opts?.tag) item = item.filter((b) => b.tag.some((t) => t.kode === opts.tag))
  if (opts?.sorotan) item = item.filter((b) => b.sorotan)
  return {
    item: item.map(({ konten: _k, ...rest }) => rest),
    meta: { kursor_berikutnya: null, ada_lagi: false, batas: 20 },
  }
}

export function mockBeritaDetail(idOrSlug: string, kelola = false): BeritaDetail | null {
  const found = MOCK_BERITA.find((b) => b.id === idOrSlug || b.slug === idOrSlug)
  if (!found) return null
  if (!kelola && !filterPublik(found)) return null
  return found
}
