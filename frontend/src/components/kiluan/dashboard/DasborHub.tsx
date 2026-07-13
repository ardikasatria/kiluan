'use client'

import { useAuth } from '@/contexts/AuthProvider'
import {
  daftarPeranPengguna,
  dasborHref,
  labelPeran,
  type PeranKode,
} from '@/lib/kiluan/peran'
import {
  kelompokkanPeranDasborHub,
  type KeluargaDasborHub,
} from '@/lib/kiluan/dasbor-hub-keluarga'
import { konfigDasborPeran } from '@/lib/kiluan/dashboard-peran'
import { Link } from '@/i18n/navigation'
import {
  ArrowRightIcon,
  BuildingLibraryIcon,
  BuildingStorefrontIcon,
  MapIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ComponentType } from 'react'

const IKON_KELUARGA: Record<KeluargaDasborHub, ComponentType<{ className?: string }>> = {
  konsumen: MapIcon,
  pengelola_desa: SparklesIcon,
  penyedia_ekonomi: BuildingStorefrontIcon,
  mitra_dampak: ShieldCheckIcon,
  tata_kelola: BuildingLibraryIcon,
}

function faseKartu(peran: PeranKode[], configs: ReturnType<typeof konfigDasborPeran>): string {
  const fase = new Set(peran.map((k) => configs[k].fase))
  return [...fase].join(' · ')
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
  const tKeluarga = useTranslations('dasbor.hub.keluarga')
  const tPeran = useTranslations('peran')
  const peranSaya = daftarPeranPengguna(user?.profil ?? null)
  const configs = konfigDasborPeran(desaSlug)
  const kartuKeluarga = kelompokkanPeranDasborHub(peranSaya)

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

      {kartuKeluarga.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
          {t('belumAdaPeran')}
        </p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kartuKeluarga.map(({ id, peran }) => {
          const Icon = IKON_KELUARGA[id]
          const fase = faseKartu(peran, configs)
          const multiPenyedia = id === 'penyedia_ekonomi' && peran.length > 1

          return (
            <li key={id}>
              <div
                className={clsx(
                  'flex h-full flex-col rounded-2xl border p-5',
                  'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800/60',
                  multiPenyedia ? '' : 'transition hover:border-kiluan-sea/50 hover:shadow-md dark:hover:border-primary-600',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-kiluan-mint/25 text-primary-700 dark:bg-primary-900/50 dark:text-kiluan-mint">
                    <Icon className="size-6" aria-hidden />
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    {t('fase', { fase })}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-primary-800 dark:text-primary-100">
                  {tKeluarga(`${id}.judul`)}
                </h3>
                <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                  {tKeluarga(`${id}.tagline`)}
                </p>
                {multiPenyedia ? (
                  <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {tKeluarga('penyedia_ekonomi.peranGanda', {
                      peran: peran.map((k) => labelPeran(k, tPeran)).join(' · '),
                    })}
                  </p>
                ) : null}
                <p className="mt-2 flex-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {tKeluarga(`${id}.deskripsi`)}
                </p>

                {multiPenyedia ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {peran.map((k) => (
                      <Link
                        key={k}
                        href={dasborHref(desaSlug, k)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-800 transition hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-200 dark:hover:bg-primary-900/50"
                      >
                        {labelPeran(k, tPeran)}
                        <ArrowRightIcon className="size-3.5 opacity-60" aria-hidden />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    href={dasborHref(desaSlug, peran[0])}
                    className="mt-4 text-sm font-semibold text-primary-700 transition hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-200"
                  >
                    {t('bukaDasbor')}
                  </Link>
                )}
              </div>
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
