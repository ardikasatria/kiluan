'use client'

import { syncMonitoring } from '@/lib/api/lestari'
import type { MonitoringCatatPayload } from '@/lib/api/types'
import { offlineDb, type PembacaanMonitoringLokal } from './db'

export async function simpanPembacaanLokal(desaSlug: string, payload: MonitoringCatatPayload) {
  if (!offlineDb) return
  await offlineDb.pembacaanMonitoring.put({
    id: payload.id!,
    desaSlug,
    payload: JSON.stringify(payload),
    status: 'menunggu_kirim',
    dibuatPada: Date.now(),
  })
}

export async function daftarPembacaanLokal(desaSlug: string): Promise<PembacaanMonitoringLokal[]> {
  if (!offlineDb) return []
  return offlineDb.pembacaanMonitoring.where('desaSlug').equals(desaSlug).reverse().sortBy('dibuatPada')
}

export async function sinkronMonitoringAntrean(desaSlug?: string): Promise<number> {
  if (!offlineDb || !navigator.onLine) return 0

  let q = offlineDb.pembacaanMonitoring.filter((r) => r.status === 'menunggu_kirim')
  if (desaSlug) q = q.filter((r) => r.desaSlug === desaSlug)
  const pending = await q.toArray()
  if (!pending.length) return 0

  const byDesa = new Map<string, PembacaanMonitoringLokal[]>()
  for (const row of pending) {
    const list = byDesa.get(row.desaSlug) ?? []
    list.push(row)
    byDesa.set(row.desaSlug, list)
  }

  let sukses = 0
  for (const [slug, rows] of byDesa) {
    try {
      const pembacaan = rows.map((r) => JSON.parse(r.payload) as MonitoringCatatPayload)
      const hasil = await syncMonitoring(slug, pembacaan)
      for (const h of hasil.hasil) {
        const row = rows.find((r) => r.id === h.id)
        if (!row) continue
        const status = h.status === 'tersimpan' || h.status === 'duplikat' ? h.status : 'ditolak'
        await offlineDb.pembacaanMonitoring.update(row.id, {
          status,
          galatKode: h.galat?.kode,
          disinkronPada: Date.now(),
        })
        if (status !== 'ditolak') sukses += 1
      }
    } catch {
      break
    }
  }
  return sukses
}
