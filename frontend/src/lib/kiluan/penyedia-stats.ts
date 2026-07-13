import { daftarPesananKelola } from '@/lib/api/dermaga'
import type { PesananRingkas } from '@/lib/api/types'

const STATUS_AKTIF = new Set(['dibayar', 'diproses'])

export interface EventAktivitasPenyedia {
  id: string
  jenis: 'pesanan'
  waktu: string
  href: string
  meta: { kode: string; status: string; total: number }
}

export interface DataDasborPenyedia {
  stats: { pesanan: number; pesananTotal: number; selesai: number }
  events: EventAktivitasPenyedia[]
}

function hrefPesanan(desaSlug: string, id: string) {
  return `/${desaSlug}/kelola/pesanan?highlight=${id}`
}

export async function ambilDataDasborPenyedia(desaSlug: string): Promise<DataDasborPenyedia> {
  let item: PesananRingkas[] = []
  try {
    const res = await daftarPesananKelola(desaSlug)
    item = res.item
  } catch {
    item = []
  }

  const aktif = item.filter((p) => STATUS_AKTIF.has(p.status)).length
  const selesai = item.filter((p) => p.status === 'selesai').length

  const events: EventAktivitasPenyedia[] = [...item]
    .sort((a, b) => b.dibuat_pada.localeCompare(a.dibuat_pada))
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      jenis: 'pesanan',
      waktu: p.dibuat_pada,
      href: hrefPesanan(desaSlug, p.id),
      meta: { kode: p.kode_pesanan, status: p.status, total: p.total },
    }))

  return {
    stats: { pesanan: aktif, pesananTotal: item.length, selesai },
    events,
  }
}
