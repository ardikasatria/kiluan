import { apiFetch } from './client'
import type { AgregatRingkasDto, AgregatSeriDto, JobAnalitikDto, LaporanBulananDto } from './types'

export async function getAgregat(
  desaSlug: string,
  params: { kode_metrik: string; dari: string; sampai: string; dimensi?: string },
): Promise<{ item: AgregatSeriDto[] }> {
  const q = new URLSearchParams({
    kode_metrik: params.kode_metrik,
    dari: params.dari,
    sampai: params.sampai,
  })
  if (params.dimensi) q.set('dimensi', params.dimensi)
  return apiFetch(`/api/v1/desa/${desaSlug}/agregat?${q}`)
}

export async function getAgregatRingkas(
  desaSlug: string,
  periode: string,
): Promise<AgregatRingkasDto> {
  return apiFetch(`/api/v1/desa/${desaSlug}/agregat/ringkas?periode=${periode}`)
}

export async function jalankanGold(desaSlug: string): Promise<{ job: JobAnalitikDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/analitik/jalankan`, { method: 'POST' })
}

export async function getJobsAnalitik(params?: {
  lapisan?: string
  status?: string
  desa_id?: string
}): Promise<{ item: JobAnalitikDto[] }> {
  const q = new URLSearchParams()
  if (params?.lapisan) q.set('lapisan', params.lapisan)
  if (params?.status) q.set('status', params.status)
  if (params?.desa_id) q.set('desa_id', params.desa_id)
  const qs = q.toString()
  return apiFetch(`/api/v1/ops/analitik/job${qs ? `?${qs}` : ''}`)
}

export async function getLaporanDaftar(
  desaSlug: string,
  params?: { periode?: string; status?: string },
): Promise<{ item: LaporanBulananDto[] }> {
  const q = new URLSearchParams()
  if (params?.periode) q.set('periode', params.periode)
  if (params?.status) q.set('status', params.status)
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/laporan${qs ? `?${qs}` : ''}`)
}

export async function generateLaporan(
  desaSlug: string,
  periode: string,
): Promise<{ laporan: LaporanBulananDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/laporan`, {
    method: 'POST',
    body: JSON.stringify({ periode }),
  })
}

export async function finalkanLaporan(
  desaSlug: string,
  laporanId: string,
): Promise<{ laporan: LaporanBulananDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/laporan/${laporanId}/transisi`, {
    method: 'POST',
    body: JSON.stringify({ aksi: 'finalkan' }),
  })
}
