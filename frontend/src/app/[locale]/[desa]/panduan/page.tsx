import { Link } from '@/i18n/navigation'
import { getProfilDesa } from '@/lib/api/desa'
import {
  ArrowLeftIcon,
  DevicePhoneMobileIcon,
  SignalSlashIcon,
  SunIcon,
} from '@heroicons/react/24/outline'
import { metadataHalamanPublik } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  const t = await getTranslations('panduan')
  return metadataHalamanPublik(desa, 'panduan', profil?.nama ?? undefined) ?? { title: t('seoTitle') }
}

export default async function PanduanDesaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  const t = await getTranslations('panduan')

  const tips = [
    { icon: SunIcon, key: 'lumba' as const },
    { icon: SignalSlashIcon, key: 'offline' as const },
    { icon: DevicePhoneMobileIcon, key: 'pwa' as const },
  ]

  const ethics = ['karang', 'sampah', 'kuota', 'lokal'] as const

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-800 to-primary-700 text-white dark:from-primary-950 dark:to-primary-900">
        <div className="container py-10 sm:py-12">
          <Link
            href={`/${desa}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-100 hover:text-white"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {t('back')}
          </Link>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{t('title', { nama: profil.nama })}</h1>
          <p className="mt-3 max-w-2xl text-primary-50/90">{t('subtitle')}</p>
        </div>
      </div>

      <div className="container py-12 sm:py-16">
        <ul className="grid gap-6 lg:grid-cols-3">
          {tips.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/60"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                <Icon className="size-6" aria-hidden />
              </div>
              <h2 className="mt-4 font-semibold text-primary-800 dark:text-primary-100">
                {t(`tips.${key}.title`)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {t(`tips.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8 dark:border-neutral-700 dark:bg-neutral-900/40">
          <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t('ethicsTitle')}</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            {ethics.map((key) => (
              <li key={key}>{t(`ethics.${key}`)}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
