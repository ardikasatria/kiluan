import type { PengajuanKartuItem, SertifikasiItem, StatusPengajuanKartu } from '@/lib/api/types'

const STATUS: Record<StatusPengajuanKartu, string> = {
  menunggu: 'Menunggu validasi',
  tervalidasi: 'Tervalidasi',
  ditolak: 'Ditolak',
  revisi: 'Perlu revisi',
}

const BUKTI: Record<string, string> = {
  foto: 'Foto bukti',
  dokumen: 'Dokumen',
  pernyataan: 'Pernyataan teks',
}

export function labelStatusPengajuan(status: StatusPengajuanKartu | string, t?: (key: string) => string): string {
  if (t) {
    try {
      return t(`status.${status}`)
    } catch {
      /* fallback */
    }
  }
  return STATUS[status as StatusPengajuanKartu] ?? status
}

export function warnaStatusPengajuan(status: string): string {
  switch (status) {
    case 'tervalidasi':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
    case 'menunggu':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
    case 'revisi':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200'
    case 'ditolak':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
    default:
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
  }
}

export function labelBuktiDibutuhkan(bukti: Record<string, boolean>, t?: (key: string) => string): string[] {
  const labels: string[] = []
  if (bukti.foto) labels.push(t ? t('bukti.foto') : BUKTI.foto)
  if (bukti.dokumen) labels.push(t ? t('bukti.dokumen') : BUKTI.dokumen)
  if (bukti.pernyataan) labels.push(t ? t('bukti.pernyataan') : BUKTI.pernyataan)
  return labels
}

/** Map pengajuan terbaru per kartu_id untuk badge di katalog. */
export function mapPengajuanPerKartu(pengajuan: PengajuanKartuItem[]): Map<number, PengajuanKartuItem> {
  const map = new Map<number, PengajuanKartuItem>()
  for (const p of pengajuan) {
    const existing = map.get(p.kartu.id)
    if (!existing || (p.dibuat_pada && existing.dibuat_pada && p.dibuat_pada > existing.dibuat_pada)) {
      map.set(p.kartu.id, p)
    }
  }
  return map
}

export function bisaAjukanKartu(status?: StatusPengajuanKartu | string): boolean {
  return !status || status === 'ditolak'
}

export function validasiBuktiLokal(
  butuh: Record<string, boolean>,
  bukti: Record<string, unknown>,
): string | null {
  if (butuh.foto && !bukti.foto_media_id) return 'foto_wajib'
  if (butuh.dokumen && !bukti.dokumen_media_id) return 'dokumen_wajib'
  if (butuh.pernyataan && !String(bukti.pernyataan ?? '').trim()) return 'pernyataan_wajib'
  return null
}

export function persenProgresTingkat(sertifikasi: SertifikasiItem | null): number {
  if (!sertifikasi?.progres?.skor_berikut) {
    if (sertifikasi?.tingkat === 'lumba_lumba') return 100
    return sertifikasi?.skor ? Math.min(100, sertifikasi.skor) : 0
  }
  const target = sertifikasi.progres.skor_berikut
  if (target <= 0) return 0
  return Math.min(100, Math.round((sertifikasi.skor / target) * 100))
}

export function kartuTervalidasiSet(sertifikasi: SertifikasiItem | null): Set<number> {
  return new Set(sertifikasi?.progres?.kartu_tervalidasi ?? [])
}
