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

class KiluanOfflineDB extends Dexie {
  antrean!: Table<AntreanSinkron, number>
  drafDestinasi!: Table<DrafDestinasi, string>

  constructor() {
    super('kiluan-offline')
    this.version(1).stores({
      antrean: '++id, desaSlug, dibuatPada',
      drafDestinasi: 'id, desaSlug',
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
  if (desaSlug) return offlineDb.antrean.where('desaSlug').equals(desaSlug).count()
  return offlineDb.antrean.count()
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
