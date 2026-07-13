'use client'

import { useAuth } from '@/contexts/AuthProvider'
import {
  daftarPeranPengguna,
  dasborHref,
  labelPeran,
  type PeranKode,
} from '@/lib/kiluan/peran'
import { konfigDasborPeran } from '@/lib/kiluan/dashboard-peran'
import { Link } from '@/i18n/navigation'
import {
  BuildingStorefrontIcon,
  GlobeAltIcon,
  MapIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ComponentType } from 'react'

const IKON: Record<PeranKode, ComponentType<{ className?: string }>> = {
  wisatawan: MapIcon,
  umkm: BuildingStorefrontIcon,
  agen: GlobeAltIcon,
  kontributor: SparklesIcon,
  organisasi: ShieldCheckIcon,
  perangkat_desa: ShieldCheckIcon,
  admin: UserIcon,
}

interface Props {
  desaSlug?: string
  profilNama?: string
  /** Hub lintas desa (Sigerciv Lampung), bukan satu desa */
  lintasDesa?: boolean
}

export default function DasborHub({ desaSlug = 'teluk-kiluan', profilNama, lintasDesa }: Props) {
  const { user } = useAuth()
  const t = useTranslations('dasbor.hub')
  const tInfo = useTranslations('dasbor.peranInfo')
  const tPeran = useTranslations('peran')
  const peranSaya = daftarPeranPengguna(user?.profil ?? null)
  const configs = konfigDasborPeran(desaSlug)
  const peranTampil = (Object.keys(configs) as PeranKode[]).filter(
    (k) => k !== 'admin' && peranSaya.includes(k),
  )

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-primary-200/60 bg-gradient-to-br from-kiluan-mint/15 via-white to-primary-50/50 p-6 dark:border-primary-800/40 dark:from-primary-950/40 dark:via-neutral-900/60 dark:to-kiluan-navy/20">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('halo')} <strong className="text-neutral-900 dark:text-neutral-100">{user?.name}</strong>
        </p>
        <h2 className="mt-2 text-xl font-bold text-primary-800 dark:text-primary-100">
          {lintasDesa ? t('pilihPeran') : t('pilihKonteks', { desa: profilNama ?? desaSlug })}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          {lintasDesa ? t('descLintas') : t('descDesa')}
        </p>
      </div>

      {peranTampil.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
          {t('belumAdaPeran')}
        </p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {peranTampil.map((k) => {
            const cfg = configs[k]
            const Icon = IKON[k]
            const href = dasborHref(desaSlug, k)

            return (
              <li key={k}>
                <Link
                  href={href}
                  className={clsx(
                    'flex h-full flex-col rounded-2xl border p-5 transition',
                    'border-neutral-200 bg-white hover:border-kiluan-sea/50 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-primary-600',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-kiluan-mint/25 text-primary-700 dark:bg-primary-900/50 dark:text-kiluan-mint">
                      <Icon className="size-6" aria-hidden />
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      {t('fase', { fase: cfg.fase })}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-primary-800 dark:text-primary-100">
                    {labelPeran(k, tPeran)}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                    {tInfo(`${k}.tagline`)}
                  </p>
                  <p className="mt-2 flex-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {tInfo(`${k}.deskripsi`)}
                  </p>
                  <span className="mt-4 text-sm font-semibold text-primary-700 dark:text-primary-300">
                    {t('bukaDasbor')}
                  </span>
                </Link>
              </li>
            )
          })}
      </ul>

      {peranSaya.includes('admin') && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-5 dark:border-primary-800 dark:bg-primary-950/30">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-700 text-white dark:bg-primary-600">
              <UserIcon className="size-5" aria-hidden />
            </div>
            <div>
              <h3 className="font-semibold text-primary-800 dark:text-primary-100">{t('adminTitle')}</h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {t('adminDesc')}
              </p>
              <Link
                href="/admin/dasbor"
                className="mt-3 inline-flex text-sm font-semibold text-primary-700 dark:text-primary-300"
              >
                {t('bukaAdmin')}
              </Link>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {t('footerNote')}
      </p>
    </div>
  )
}
