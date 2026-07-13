import { daftarPesananSaya } from '@/lib/api/dermaga'
import { getKontribusiSaya } from '@/lib/api/kontribusi'
import { getPoinSaya } from '@/lib/api/lencana'
import { getPasporSaya, getStempelSaya } from '@/lib/api/penjelajah'
import { getDaftarSimpanan, labelTipeSimpanan, type SimpananItem } from '@/lib/api/simpanan'
import type { KontribusiItem, PesananRingkas, StempelDto } from '@/lib/api/types'

const BATAS_DESA_AGGREGAT = 16
const BATAS_HALAMAN_SIMPANAN = 10
const BATAS_AKTIVITAS = 6

const PESANAN_SELESAI = new Set(['selesai', 'dibatalkan', 'kedaluwarsa'])

export type JenisAktivitasWisatawan = 'simpanan' | 'kontribusi' | 'stempel' | 'pesanan'

export interface EventAktivitasWisatawan {
  id: string
  jenis: JenisAktivitasWisatawan
  waktu: string
  href?: string
  meta: Record<string, string>
}

export interface MetaWidgetPesanan {
  total: number
  aktif: number
  desaSlug: string
}

export interface DataDasborWisatawanLintas {
  stats: Record<string, number>
  pesanan: MetaWidgetPesanan
  events: EventAktivitasWisatawan[]
}

/** Kumpulkan slug desa unik dari wishlist + desa pilot untuk agregasi lintas desa. */
export function slugDesaUntukAgregat(items: SimpananItem[], desaPilot: string): string[] {
  const slugs = new Set<string>([desaPilot])
  for (const item of items) {
    if (item.desa_slug) slugs.add(item.desa_slug)
  }
  return [...slugs].slice(0, BATAS_DESA_AGGREGAT)
}

async function muatSimpananLengkap(): Promise<SimpananItem[]> {
  const items: SimpananItem[] = []
  let kursor: string | undefined

  for (let hal = 0; hal < BATAS_HALAMAN_SIMPANAN; hal++) {
    const res = await getDaftarSimpanan({ batas: 100, kursor })
    items.push(...res.item)
    if (!res.meta.ada_lagi || !res.meta.kursor_berikutnya) break
    kursor = res.meta.kursor_berikutnya
  }

  return items
}

function eventSimpanan(item: SimpananItem): EventAktivitasWisatawan {
  return {
    id: `simpanan-${item.id}`,
    jenis: 'simpanan',
    waktu: item.dibuat_pada ?? new Date(0).toISOString(),
    href: '/saya/wishlist',
    meta: {
      nama: item.entitas.nama,
      tipe: item.tipe,
      desa: item.desa_nama,
    },
  }
}

function eventKontribusi(item: KontribusiItem, desaSlug: string): EventAktivitasWisatawan {
  return {
    id: `kontrib-${desaSlug}-${item.id}`,
    jenis: 'kontribusi',
    waktu: item.dibuat_pada ?? item.diperbarui_pada ?? new Date(0).toISOString(),
    href: `/${desaSlug}/kontribusi`,
    meta: {
      tipe: item.tipe,
      status: item.status,
      desa: desaSlug,
    },
  }
}

function eventStempel(stempel: StempelDto, desaSlug: string): EventAktivitasWisatawan {
  return {
    id: `stempel-${desaSlug}-${stempel.id}`,
    jenis: 'stempel',
    waktu: stempel.dibuat_pada,
    href: '/paspor',
    meta: {
      misi: stempel.misi?.judul ?? stempel.misi_id,
      status: stempel.status,
      desa: desaSlug,
    },
  }
}

function eventPesanan(p: PesananRingkas, desaSlug: string): EventAktivitasWisatawan {
  return {
    id: `pesanan-${desaSlug}-${p.id}`,
    jenis: 'pesanan',
    waktu: p.dibuat_pada,
    href: `/${desaSlug}/pesanan/${p.id}`,
    meta: {
      kode: p.kode_pesanan,
      status: p.status,
      desa: desaSlug,
    },
  }
}

function gabungAktivitas(events: EventAktivitasWisatawan[]): EventAktivitasWisatawan[] {
  return [...events]
    .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())
    .slice(0, BATAS_AKTIVITAS)
}

async function agregatPerDesa(
  desaSlugs: string[],
  simpanan: SimpananItem[],
): Promise<{
  stempel: number
  kontrib: number
  poin: number
  pesanan: MetaWidgetPesanan
  events: EventAktivitasWisatawan[]
}> {
  let stempel = 0
  let kontrib = 0
  let poin = 0
  let pesananTotal = 0
  let pesananAktif = 0
  let pesananDesaSlug = desaSlugs[0] ?? 'teluk-kiluan'
  const events: EventAktivitasWisatawan[] = []

  for (const item of simpanan) {
    if (item.dibuat_pada) events.push(eventSimpanan(item))
  }

  await Promise.all(
    desaSlugs.map(async (slug) => {
      const [pasporRes, kontribRes, poinRes, stempelRes, pesananRes] = await Promise.allSettled([
        getPasporSaya(slug),
        getKontribusiSaya(slug, { batas: 20 }),
        getPoinSaya(slug, { batas: 1 }),
        getStempelSaya(slug),
        daftarPesananSaya(slug),
      ])

      if (pasporRes.status === 'fulfilled') {
        stempel += pasporRes.value.total_stempel ?? 0
      }
      if (kontribRes.status === 'fulfilled') {
        kontrib += kontribRes.value.item.length
        for (const k of kontribRes.value.item) events.push(eventKontribusi(k, slug))
      }
      if (poinRes.status === 'fulfilled') {
        poin += poinRes.value.saldo ?? 0
      }
      if (stempelRes.status === 'fulfilled') {
        for (const s of stempelRes.value.item) events.push(eventStempel(s, slug))
      }
      if (pesananRes.status === 'fulfilled' && pesananRes.value.item.length > 0) {
        if (pesananTotal === 0) pesananDesaSlug = slug
        pesananTotal += pesananRes.value.item.length
        for (const p of pesananRes.value.item) {
          if (!PESANAN_SELESAI.has(p.status)) pesananAktif += 1
          events.push(eventPesanan(p, slug))
        }
      }
    }),
  )

  return {
    stempel,
    kontrib,
    poin,
    pesanan: { total: pesananTotal, aktif: pesananAktif, desaSlug: pesananDesaSlug },
    events: gabungAktivitas(events),
  }
}

/** Stat + widget meta + feed aktivitas wisatawan lintas desa. */
export async function ambilDataDasborWisatawanLintas(
  desaPilot = 'teluk-kiluan',
): Promise<DataDasborWisatawanLintas> {
  try {
    const simpanan = await muatSimpananLengkap()
    const desaSlugs = slugDesaUntukAgregat(simpanan, desaPilot)
    const agregat = await agregatPerDesa(desaSlugs, simpanan)

    return {
      stats: {
        wishlist: simpanan.length,
        stempel: agregat.stempel,
        kontrib: agregat.kontrib,
        poin: agregat.poin,
      },
      pesanan: agregat.pesanan,
      events: agregat.events,
    }
  } catch {
    return {
      stats: { wishlist: 0, stempel: 0, kontrib: 0, poin: 0 },
      pesanan: { total: 0, aktif: 0, desaSlug: desaPilot },
      events: [],
    }
  }
}

/** @deprecated Gunakan ambilDataDasborWisatawanLintas */
export async function ambilStatsWisatawanLintas(desaPilot = 'teluk-kiluan') {
  const data = await ambilDataDasborWisatawanLintas(desaPilot)
  return data.stats
}

export { labelTipeSimpanan }
