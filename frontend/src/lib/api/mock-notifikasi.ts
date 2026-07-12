import type { MetaPaginasi, NotifikasiHitungResponse, NotifikasiItem, StatusNotifikasi } from './types'

let mockInbox: NotifikasiItem[] = [
  {
    id: 'ntf-1',
    tipe: 'pembayaran_berhasil',
    judul: 'Pembayaran berhasil',
    isi: 'Pesanan #KLN-1042 telah dibayar. E-tiket siap di halaman pesanan.',
    entitas_tipe: 'pesanan',
    entitas_id: 'ord-1042',
    status: 'belum_dibaca',
    dibuat_pada: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: 'ntf-2',
    tipe: 'booking_terkonfirmasi',
    judul: 'Booking terkonfirmasi',
    isi: 'Trip lumba-lumba 12 Juli pukul 06:00 — kode check-in dikirim.',
    entitas_tipe: 'booking',
    entitas_id: 'bk-88',
    status: 'belum_dibaca',
    dibuat_pada: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 'ntf-3',
    tipe: 'stempel_terverifikasi',
    judul: 'Stempel misi terverifikasi',
    isi: 'Misi "Pantau sampah pantai" disetujui. +25 poin dampak.',
    entitas_tipe: 'paspor',
    entitas_id: 'psp-1',
    status: 'dibaca',
    dibuat_pada: new Date(Date.now() - 24 * 3600_000).toISOString(),
    dibaca_pada: new Date(Date.now() - 20 * 3600_000).toISOString(),
  },
  {
    id: 'ntf-4',
    tipe: 'pesanan_dibayar',
    judul: 'Pesanan masuk',
    isi: 'Pembeli baru memesan Kopi Robusta 250g × 2.',
    entitas_tipe: 'pesanan',
    entitas_id: 'ord-1043',
    status: 'belum_dibaca',
    dibuat_pada: new Date(Date.now() - 30 * 60_000).toISOString(),
  },
]

export function mockDaftarNotifikasi(opts?: {
  status?: StatusNotifikasi
  batas?: number
}): { item: NotifikasiItem[]; meta: MetaPaginasi } {
  let item = [...mockInbox].sort(
    (a, b) => new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime(),
  )
  if (opts?.status) item = item.filter((n) => n.status === opts.status)
  const batas = opts?.batas ?? 20
  return {
    item: item.slice(0, batas),
    meta: { kursor_berikutnya: null, ada_lagi: item.length > batas, batas },
  }
}

export function mockHitungNotifikasi(): NotifikasiHitungResponse {
  return {
    belum_dibaca: mockInbox.filter((n) => n.status === 'belum_dibaca').length,
  }
}

export function mockTandaiBaca(id: string): NotifikasiItem | null {
  const idx = mockInbox.findIndex((n) => n.id === id)
  if (idx < 0) return null
  mockInbox[idx] = {
    ...mockInbox[idx],
    status: 'dibaca',
    dibaca_pada: new Date().toISOString(),
  }
  return mockInbox[idx]
}

export function mockTandaiSemuaBaca(): { diperbarui: number } {
  let count = 0
  mockInbox = mockInbox.map((n) => {
    if (n.status === 'belum_dibaca') {
      count++
      return { ...n, status: 'dibaca', dibaca_pada: new Date().toISOString() }
    }
    return n
  })
  return { diperbarui: count }
}
