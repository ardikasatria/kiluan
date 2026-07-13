import Dexie, { type Table } from 'dexie'

export interface AntreanSinkron {
  id?: number
  desaSlug: string
  method: 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: string
  dibuatPada: number
}

export interface DrafDestinasi {
  id: string
  desaSlug: string
  payload: string
  diperbaruiPada: number
}

export type StatusAntreanMonitoring =
  | 'menunggu_kirim'
  | 'tersimpan'
  | 'duplikat'
  | 'ditolak'

export interface PembacaanMonitoringLokal {
  id: string
  desaSlug: string
  payload: string
  status: StatusAntreanMonitoring
  galatKode?: string
  dibuatPada: number
  disinkronPada?: number
}

class KiluanOfflineDB extends Dexie {
  antrean!: Table<AntreanSinkron, number>
  drafDestinasi!: Table<DrafDestinasi, string>
  pembacaanMonitoring!: Table<PembacaanMonitoringLokal, string>

  constructor() {
    super('kiluan-offline')
    this.version(1).stores({
      antrean: '++id, desaSlug, dibuatPada',
      drafDestinasi: 'id, desaSlug',
    })
    this.version(2).stores({
      antrean: '++id, desaSlug, dibuatPada',
      drafDestinasi: 'id, desaSlug',
      pembacaanMonitoring: 'id, desaSlug, status, dibuatPada',
    })
  }
}

export const offlineDb = typeof window !== 'undefined' ? new KiluanOfflineDB() : null

export async function tambahAntrean(item: Omit<AntreanSinkron, 'id' | 'dibuatPada'>) {
  if (!offlineDb) return
  await offlineDb.antrean.add({ ...item, dibuatPada: Date.now() })
}

export async function hitungAntrean(desaSlug?: string) {
  if (!offlineDb) return 0
  let n = 0
  if (desaSlug) {
    n += await offlineDb.antrean.where('desaSlug').equals(desaSlug).count()
    n += await offlineDb.pembacaanMonitoring
      .where('desaSlug')
      .equals(desaSlug)
      .filter((r) => r.status === 'menunggu_kirim')
      .count()
  } else {
    n += await offlineDb.antrean.count()
    n += await offlineDb.pembacaanMonitoring.filter((r) => r.status === 'menunggu_kirim').count()
  }
  return n
}

export async function simpanDrafDestinasi(desaSlug: string, id: string, payload: unknown) {
  if (!offlineDb) return
  await offlineDb.drafDestinasi.put({
    id,
    desaSlug,
    payload: JSON.stringify(payload),
    diperbaruiPada: Date.now(),
  })
}

export async function ambilDrafDestinasi(desaSlug: string, id: string) {
  if (!offlineDb) return null
  const row = await offlineDb.drafDestinasi.get(id)
  if (!row || row.desaSlug !== desaSlug) return null
  return JSON.parse(row.payload) as unknown
}
