import type { Locale } from '@/i18n/routing'
import { pesanErrorDariKode } from '@/lib/i18n/errors'
import { ApiError } from './client'

interface GalatAmplop {
  galat?: { kode?: string; pesan?: string; rincian?: { field: string; pesan: string }[] }
}

export function pesanGalat(err: unknown, locale: Locale = 'id'): string {
  if (err instanceof ApiError) {
    const body = err.body as GalatAmplop | undefined
    const kode = body?.galat?.kode
    if (kode) return pesanErrorDariKode(kode, locale)
    if (body?.galat?.pesan) return body.galat.pesan
    if (body?.galat?.rincian?.[0]?.pesan) return body.galat.rincian[0].pesan
  }
  if (err instanceof Error) return err.message
  return pesanErrorDariKode('default', locale)
}

export function kodeGalat(err: unknown): string | null {
  if (err instanceof ApiError) {
    const body = err.body as GalatAmplop | undefined
    return body?.galat?.kode ?? null
  }
  return null
}
