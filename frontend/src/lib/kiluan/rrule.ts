import { RRule, type Options } from 'rrule'

/** Kode hari RRULE (RFC 5545 BYDAY). */
export const HARI_RRULE = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export type HariRrule = (typeof HARI_RRULE)[number]

const RRULE_KE_HARI: Record<HariRrule, typeof RRule.MO> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
}

/** getDay() JS: 0=Minggu … 6=Sabtu */
const JS_KE_HARI: HariRrule[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function isHariRrule(s: string): s is HariRrule {
  return (HARI_RRULE as readonly string[]).includes(s)
}

export function hariDariTanggal(isoDate: string): HariRrule {
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return 'MO'
  return JS_KE_HARI[d.getDay()] ?? 'MO'
}

/** Ambil BYDAY dari objek pengulangan (array atau string dipisah koma). */
export function parseByday(sumber?: Record<string, unknown> | null): HariRrule[] {
  if (!sumber) return []
  const raw = sumber.byday
  let kandidat: string[] = []
  if (Array.isArray(raw)) {
    kandidat = raw.map((v) => String(v).trim().toUpperCase())
  } else if (typeof raw === 'string') {
    kandidat = raw.split(',').map((v) => v.trim().toUpperCase())
  }
  const unik = new Set<HariRrule>()
  for (const k of kandidat) {
    if (isHariRrule(k)) unik.add(k)
  }
  return HARI_RRULE.filter((h) => unik.has(h))
}

/** Normalisasi payload pengulangan sebelum dikirim ke API. */
export function normalisasiPengulangan(sumber: Record<string, unknown>): Record<string, unknown> {
  const freq = String(sumber.freq ?? 'DAILY').toUpperCase()
  const interval = Math.max(1, Number(sumber.interval ?? 1) || 1)
  const out: Record<string, unknown> = { freq, interval }
  if (freq === 'WEEKLY') {
    const byday = parseByday(sumber)
    if (byday.length) out.byday = byday
  }
  return out
}

export function byweekdayDariByday(byday: HariRrule[]): Options['byweekday'] {
  return byday.map((h) => RRULE_KE_HARI[h])
}

export interface OpsiRrulePreview {
  freq: string
  interval?: number
  byday?: HariRrule[]
  berlakuMulai: string
  berlakuSampai?: string
  count?: number
}

/** Bangun instance RRule untuk pratinjau tanggal di klien. */
export function buatRrulePreview({
  freq,
  interval = 1,
  byday = [],
  berlakuMulai,
  berlakuSampai,
  count = 8,
}: OpsiRrulePreview): Date[] {
  try {
    const dtstart = new Date(`${berlakuMulai}T00:00:00`)
    if (Number.isNaN(dtstart.getTime())) return []

    const isWeekly = freq === 'WEEKLY'
    const rule = new RRule({
      freq: isWeekly ? RRule.WEEKLY : RRule.DAILY,
      interval: Math.max(1, interval),
      dtstart,
      until: berlakuSampai ? new Date(`${berlakuSampai}T23:59:59`) : undefined,
      count: berlakuSampai ? undefined : count,
      ...(isWeekly && byday.length ? { byweekday: byweekdayDariByday(byday) } : {}),
    })
    return rule.all().slice(0, count)
  } catch {
    return []
  }
}

/** Ringkas BYDAY untuk tampilan daftar, mis. "Sen, Rab, Jum". */
export function labelByday(byday: HariRrule[], tr: (key: string) => string): string {
  return byday.map((h) => tr(`hari.${h}`)).join(', ')
}
