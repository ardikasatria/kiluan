import type { ApiError } from './client'

interface GalatAmplop {
  galat?: { kode?: string; pesan?: string; rincian?: { field: string; pesan: string }[] }
}

export function pesanGalat(err: unknown): string {
  if (err instanceof Error && 'body' in err) {
    const body = (err as ApiError).body as GalatAmplop | undefined
    if (body?.galat?.pesan) return body.galat.pesan
    if (body?.galat?.rincian?.[0]?.pesan) return body.galat.rincian[0].pesan
  }
  if (err instanceof Error) return err.message
  return 'Terjadi kesalahan'
}
