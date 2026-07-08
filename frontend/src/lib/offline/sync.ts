'use client'

import { apiFetch } from '@/lib/api/client'
import { offlineDb } from './db'

export async function prosesAntreanSinkron() {
  if (!offlineDb || !navigator.onLine) return 0

  const items = await offlineDb.antrean.orderBy('dibuatPada').toArray()
  let sukses = 0

  for (const item of items) {
    try {
      await apiFetch(item.path, {
        method: item.method,
        body: item.body,
      })
      if (item.id != null) await offlineDb.antrean.delete(item.id)
      sukses += 1
    } catch {
      break
    }
  }
  return sukses
}
