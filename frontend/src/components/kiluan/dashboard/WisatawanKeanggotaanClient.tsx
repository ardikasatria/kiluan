'use client'

import DashboardViewShell from '@/components/kiluan/dashboard/DashboardViewShell'
import { useAuth } from '@/contexts/AuthProvider'
import { daftarDesaDiscovery } from '@/lib/api/discovery'
import { getProfilDesa } from '@/lib/api/desa'
import type { DashboardPeranConfig } from '@/lib/kiluan/dashboard-peran'
import { labelPeran, type PeranKode } from '@/lib/kiluan/peran'
import {
  hrefDasborPeranAktif,
  hrefGabung,
  PERAN_ESKALASI,
  ringkasanAjuanWisatawan,
  type RingkasanAjuanPeran,
  type StatusAjuan,
} from '@/lib/kiluan/wisatawan-keanggotaan'
import { RUTE_GABUNG } from '@/lib/kiluan/rute-sigerciv'
import { Link } from '@/i18n/navigation'
import {
  BuildingStorefrontIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState, type ComponentType } from 'react'

const IKON: Record<(typeof PERAN_ESKALASI)[number], ComponentType<{ className?: string }>> = {
  kontributor: SparklesIcon,
  umkm: BuildingStorefrontIcon,
  agen: GlobeAltIcon,
  organisasi: ShieldCheckIcon,
}

const BADGE: Record<StatusAjuan, string> = {
  aktif: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  menunggu: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  ditolak: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  revisi: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  nonaktif: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  belum: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500',
}

interface Props {
  config: DashboardPeranConfig
  desaPilot?: string
}

function StatusBadge({ status }: { status: StatusAjuan }) {
  const t = useTranslations('dasbor.wisatawan.peran.status')
  const key = status as 'aktif' | 'menunggu' | 'ditolak' | 'revisi' | 'nonaktif' | 'belum'
  return (
    <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', BADGE[status])}>
      {t(key)}
    </span>
  )
}

function KartuPeran({
  ringkasan,
  desaPilot,
  tPeran,
  tInfo,
  t,
}: {
  ringkasan: RingkasanAjuanPeran
  desaPilot: string
  tPeran: ReturnType<typeof useTranslations<'peran'>>
  tInfo: ReturnType<typeof useTranslations<'dasbor.peranInfo'>>
  t: ReturnType<typeof useTranslations<'dasbor.wisatawan.peran'>>
}) {
  const { peran, entri, statusUtama } = ringkasan
  const Icon = IKON[peran]
  const entriAktif = entri.find((e) => e.status === 'aktif')
  const entriTertunda = entri.find((e) => e.status === 'menunggu')
  const entriRevisi = entri.find((e) => e.status === 'revisi' || e.status === 'ditolak')

  let ctaHref: string | null = null
  let ctaLabel = ''
  let ctaPrimary = false

  if (statusUtama === 'belum') {
    ctaHref = hrefGabung(peran)
    ctaLabel = t('cta.ajukan')
    ctaPrimary = true
  } else if (statusUtama === 'aktif' && entriAktif) {
    ctaHref = hrefDasborPeranAktif(peran, entriAktif.desaSlug, desaPilot)
    ctaLabel = t('cta.bukaDasbor')
    ctaPrimary = true
  } else if (entriRevisi) {
    ctaHref = hrefGabung(peran, entriRevisi.desaSlug)
    ctaLabel = t('cta.submitUlang')
    ctaPrimary = true
  } else if (entriTertunda) {
    ctaHref = null
    ctaLabel = ''
  }

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-kiluan-mint/25 text-primary-700 dark:bg-primary-900/50 dark:text-kiluan-mint">
          <Icon className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-primary-800 dark:text-primary-100">
              {labelPeran(peran, tPeran as (key: PeranKode) => string)}
            </h3>
            <StatusBadge status={statusUtama} />
          </div>
          <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">
            {tInfo(`${peran}.tagline`)}
          </p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{tInfo(`${peran}.deskripsi`)}</p>

          {entri.length > 0 ? (
            <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-700">
              {entri.map((e, i) => (
                <li key={`${e.desaId ?? 'global'}-${i}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {e.desaNama ?? (e.desaId ? t('desaKeanggotaan') : t('global'))}
                  </span>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{t('belumAjukan')}</p>
          )}

          {statusUtama === 'menunggu' ? (
            <p className="mt-3 text-xs text-amber-800 dark:text-amber-300">{t('menungguInfo')}</p>
          ) : null}
          {(statusUtama === 'ditolak' || statusUtama === 'revisi') && !ctaHref ? (
            <p className="mt-3 text-xs text-red-700 dark:text-red-300">{t('revisiInfo')}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            {ctaHref ? (
              <Link
                href={ctaHref}
                className={clsx(
                  'inline-flex rounded-xl px-4 py-2 text-sm font-semibold transition',
                  ctaPrimary
                    ? 'bg-primary-700 text-white hover:bg-primary-600 dark:bg-primary-600'
                    : 'border border-neutral-300 text-neutral-800 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200',
                )}
              >
                {ctaLabel}
              </Link>
            ) : null}
            {statusUtama !== 'belum' && peran !== 'organisasi' ? (
              <Link
                href={hrefGabung(peran)}
                className="inline-flex rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300"
              >
                {t('cta.tambahDesa')}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function WisatawanKeanggotaanClient({ config, desaPilot = 'teluk-kiluan' }: Props) {
  const { user } = useAuth()
  const t = useTranslations('dasbor.wisatawan.peran')
  const tPeran = useTranslations('peran')
  const tInfo = useTranslations('dasbor.peranInfo')
  const [desaMap, setDesaMap] = useState<Map<string, { slug: string; nama: string }>>(new Map())
  const [memuatDesa, setMemuatDesa] = useState(true)

  useEffect(() => {
    let batal = false
    ;(async () => {
      try {
        const res = await daftarDesaDiscovery({ batas: 48 })
        const map = new Map<string, { slug: string; nama: string }>()
        await Promise.all(
          res.item.map(async (d) => {
            const profil = await getProfilDesa(d.slug)
            if (profil?.id) {
              map.set(String(profil.id), { slug: d.slug, nama: profil.nama })
            }
          }),
        )
        if (!batal) setDesaMap(map)
      } finally {
        if (!batal) setMemuatDesa(false)
      }
    })()
    return () => {
      batal = true
    }
  }, [])

  const ringkasan = useMemo(
    () => ringkasanAjuanWisatawan(user?.profil ?? null, desaMap),
    [user?.profil, desaMap],
  )

  const adaMenunggu = ringkasan.some((r) => r.statusUtama === 'menunggu')

  return (
    <DashboardViewShell
      desaSlug="sigerciv"
      desaNama="Sigerciv · Lampung"
      config={config}
      sectionTitle={t('judul')}
      lintasDesa
    >
      <div className="space-y-8">
        <div className="rounded-2xl border border-primary-200/60 bg-gradient-to-br from-kiluan-mint/15 via-white to-primary-50/50 p-5 dark:border-primary-800/40 dark:from-primary-950/40 dark:via-neutral-900/60 dark:to-kiluan-navy/20 sm:p-6">
          <p className="max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{t('intro')}</p>
          {adaMenunggu ? (
            <p className="mt-3 text-sm font-medium text-amber-800 dark:text-amber-300">{t('bannerMenunggu')}</p>
          ) : null}
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('peranDefault')}</h2>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800/60">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-kiluan-mint/25 text-primary-700 dark:bg-primary-900/50">
                <UserGroupIcon className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary-800 dark:text-primary-100">
                  {labelPeran('wisatawan', tPeran as (key: PeranKode) => string)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('wisatawanDesc')}</p>
              </div>
              <StatusBadge status="aktif" />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('peranLain')}</h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('peranLainDesc')}</p>
            </div>
            <Link
              href={RUTE_GABUNG}
              className="text-sm font-semibold text-primary-700 hover:text-primary-600 dark:text-primary-300"
            >
              {t('cta.tambahPeran')}
            </Link>
          </div>

          {memuatDesa ? (
            <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('memuat')}</p>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {ringkasan.map((r) => (
                <KartuPeran
                  key={r.peran}
                  ringkasan={r}
                  desaPilot={desaPilot}
                  tPeran={tPeran}
                  tInfo={tInfo}
                  t={t}
                />
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t('footer')}{' '}
          <Link href="/saya/akun#keanggotaan" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            {t('footerAkun')}
          </Link>
        </p>
      </div>
    </DashboardViewShell>
  )
}
