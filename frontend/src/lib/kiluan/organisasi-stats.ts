import { getLaporanDaftar } from '@/lib/api/analitik'
import {
  getIndikator,
  getMonitoringSaya,
  getNeracaLestari,
  getSaldoKonservasi,
  getVerifikasiMonitoring,
} from '@/lib/api/lestari'
import type { MonitoringDto } from '@/lib/api/types'

export interface EventAktivitasOrganisasi {
  id: string
  jenis: 'monitoring'
  waktu: string
  href: string
  meta: { indikator: string; status: string; nilai: number }
}

export interface DataDasborOrganisasi {
  stats: {
    monitoring: number
    indikator: number
    verifikasi: number
    neraca: number
    laporan: number
    dana: string
    saldo: number
  }
  events: EventAktivitasOrganisasi[]
}

function labelIndikator(m: MonitoringDto): string {
  const ind = m.indikator
  if (ind && typeof ind === 'object' && 'nama' in ind && typeof ind.nama === 'string') {
    return ind.nama
  }
  return `#${typeof ind === 'object' && 'id' in ind ? ind.id : '?'}`
}

function formatSaldo(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} jt`
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`
  return String(n)
}

export async function ambilDataDasborOrganisasi(desaSlug: string): Promise<DataDasborOrganisasi> {
  const [monitoring, indikator, verifikasi, neraca, laporan, saldo] = await Promise.all([
    getMonitoringSaya(desaSlug).catch(() => ({ item: [] as MonitoringDto[] })),
    getIndikator(desaSlug).catch(() => ({ item: [] })),
    getVerifikasiMonitoring(desaSlug).catch(() => ({ item: [] })),
    getNeracaLestari(desaSlug).catch(() => ({ item: [] })),
    getLaporanDaftar(desaSlug).catch(() => ({ item: [] })),
    getSaldoKonservasi(desaSlug).catch(() => ({ saldo: 0, total_masuk: 0, total_keluar: 0, per_kategori: {}, per_sumber: {} })),
  ])

  const events: EventAktivitasOrganisasi[] = [...monitoring.item]
    .sort((a, b) => b.waktu_ukur.localeCompare(a.waktu_ukur))
    .slice(0, 8)
    .map((m) => ({
      id: m.id,
      jenis: 'monitoring',
      waktu: m.waktu_ukur,
      href: `/${desaSlug}/lestari/monitoring`,
      meta: { indikator: labelIndikator(m), status: m.status, nilai: m.nilai },
    }))

  return {
    stats: {
      monitoring: monitoring.item.length,
      indikator: indikator.item.length,
      verifikasi: verifikasi.item.length,
      neraca: neraca.item.length,
      laporan: laporan.item.length,
      saldo: saldo.saldo,
      dana: saldo.saldo > 0 ? formatSaldo(saldo.saldo) : '—',
    },
    events,
  }
}

/** Stats ringkas untuk server component (SSR awal). */
export async function statsDasborOrganisasi(
  desaSlug: string,
): Promise<Record<string, string | number>> {
  const data = await ambilDataDasborOrganisasi(desaSlug)
  return data.stats
}
