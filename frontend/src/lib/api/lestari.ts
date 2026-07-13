import { apiFetch } from './client'
import type {
  DanaCatatPayload,
  DanaKonservasiDto,
  DayaDukungDto,
  IndikatorEkologiDto,
  MonitoringCatatPayload,
  MonitoringDto,
  NeracaLestariDto,
  PemakaianKapasitasDto,
  SaldoKonservasiDto,
  VerifikasiDto,
} from './types'

export async function getIndikator(desaSlug: string): Promise<{ item: IndikatorEkologiDto[] }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/indikator`, { auth: false })
}

export async function getMonitoringSaya(
  desaSlug: string,
  params?: { status?: string },
): Promise<{ item: MonitoringDto[] }> {
  const q = new URLSearchParams({ milik: 'saya' })
  if (params?.status) q.set('status', params.status)
  return apiFetch(`/api/v1/desa/${desaSlug}/monitoring?${q}`)
}

export async function getMonitoringDetail(
  desaSlug: string,
  id: string,
): Promise<{ monitoring: MonitoringDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/monitoring/${id}`)
}

export async function catatMonitoring(
  desaSlug: string,
  body: MonitoringCatatPayload,
): Promise<{ monitoring: MonitoringDto; verifikasi: { id: string; hasil: string } }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/monitoring`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function syncMonitoring(
  desaSlug: string,
  pembacaan: MonitoringCatatPayload[],
): Promise<{
  hasil: { id: string; status: string; verifikasi_id?: string | null; galat?: { kode: string } | null }[]
}> {
  return apiFetch(`/api/v1/desa/${desaSlug}/monitoring/sync`, {
    method: 'POST',
    body: JSON.stringify({ pembacaan }),
  })
}

export async function getSaldoKonservasi(desaSlug: string): Promise<SaldoKonservasiDto> {
  return apiFetch(`/api/v1/desa/${desaSlug}/dana-konservasi/saldo`, { auth: false })
}

export async function getDanaKonservasi(
  desaSlug: string,
  params?: { jenis?: string; publik?: boolean },
): Promise<{ item: DanaKonservasiDto[] }> {
  const q = new URLSearchParams()
  if (params?.jenis) q.set('jenis', params.jenis)
  if (params?.publik) q.set('publik', 'true')
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/dana-konservasi${qs ? `?${qs}` : ''}`, {
    auth: params?.publik ? false : undefined,
  })
}

export async function catatDanaKonservasi(
  desaSlug: string,
  body: DanaCatatPayload,
  idempotencyKey: string,
): Promise<{ entri: DanaKonservasiDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/dana-konservasi`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  })
}

export async function getVerifikasiMonitoring(
  desaSlug: string,
): Promise<{ item: VerifikasiDto[] }> {
  return apiFetch(
    `/api/v1/desa/${desaSlug}/verifikasi?entitas_tipe=monitoring_ekologi&hasil=menunggu`,
  )
}

export { putuskanVerifikasi } from './penjelajah'
export { unggahBuktiFoto, ambilLokasi } from './penjelajah'

export async function getDayaDukung(desaSlug: string): Promise<{ item: DayaDukungDto[] }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/daya-dukung`)
}

export async function upsertDayaDukung(
  desaSlug: string,
  destinasiId: string,
  body: Omit<DayaDukungDto, 'destinasi_id' | 'diperbarui_pada'>,
): Promise<{ daya_dukung: DayaDukungDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/daya-dukung/${destinasiId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function getKapasitas(
  desaSlug: string,
  params?: { destinasi_id?: string; dari?: string; sampai?: string; publik?: boolean },
): Promise<{ item: PemakaianKapasitasDto[] }> {
  const q = new URLSearchParams()
  if (params?.destinasi_id) q.set('destinasi_id', params.destinasi_id)
  if (params?.dari) q.set('dari', params.dari)
  if (params?.sampai) q.set('sampai', params.sampai)
  if (params?.publik) q.set('publik', 'true')
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/kapasitas${qs ? `?${qs}` : ''}`, {
    auth: params?.publik ? false : undefined,
  })
}

export async function getKapasitasHariIni(desaSlug: string): Promise<{ item: PemakaianKapasitasDto[] }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/kapasitas/hari-ini?publik=true`, { auth: false })
}

export async function hitungKapasitas(
  desaSlug: string,
  tanggal?: string,
): Promise<{ item: PemakaianKapasitasDto[] }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/kapasitas/hitung`, {
    method: 'POST',
    body: JSON.stringify({ tanggal: tanggal ?? null }),
  })
}

export async function getNeracaLestari(
  desaSlug: string,
  params?: { dari?: string; sampai?: string; publik?: boolean },
): Promise<{ item: NeracaLestariDto[] }> {
  const q = new URLSearchParams()
  if (params?.dari) q.set('dari', params.dari)
  if (params?.sampai) q.set('sampai', params.sampai)
  if (params?.publik) q.set('publik', 'true')
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/neraca${qs ? `?${qs}` : ''}`, {
    auth: params?.publik ? false : undefined,
  })
}

export async function getNeracaPeriode(
  desaSlug: string,
  periode: string,
  publik = false,
): Promise<{ neraca: NeracaLestariDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/neraca/${periode}${publik ? '?publik=true' : ''}`, {
    auth: publik ? false : undefined,
  })
}

export async function hitungNeracaLestari(
  desaSlug: string,
  periode: string,
): Promise<{ neraca: NeracaLestariDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/neraca/hitung`, {
    method: 'POST',
    body: JSON.stringify({ periode }),
  })
}
