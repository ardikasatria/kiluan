import { Link } from '@/i18n/navigation'
import { getProfilDesa } from '@/lib/api/desa'
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  UserGroupIcon,
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
  const t = await getTranslations('tentang')
  return metadataHalamanPublik(desa, 'tentang', profil?.nama ?? undefined) ?? { title: t('seoTitle') }
}

export default async function TentangDesaPage({ params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  const t = await getTranslations('tentang')
  const lokasi = [profil.pekon, profil.kecamatan, profil.kabupaten, profil.provinsi].filter(Boolean)

  const peran = [
    { icon: UserGroupIcon, key: 'pokdarwis' as const },
    { icon: BuildingOffice2Icon, key: 'umkm' as const },
    { icon: GlobeAltIcon, key: 'platform' as const },
  ]

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
        <div className="container py-10 sm:py-12">
          <Link
            href={`/${desa}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-600 dark:text-primary-300"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {t('back')}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-primary-800 sm:text-4xl dark:text-primary-100">
            {t('title', { nama: profil.nama })}
          </h1>
          {profil.deskripsi && (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">
              {profil.deskripsi}
            </p>
          )}
        </div>
      </div>

      <div className="container py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">
                {t('communityTitle')}
              </h2>
              <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
                {t('communityBody', { nama: profil.nama })}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t('rolesTitle')}</h2>
              <ul className="mt-4 space-y-4">
                {peran.map(({ icon: Icon, key }) => (
                  <li
                    key={key}
                    className="flex gap-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700 dark:bg-neutral-800/40"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {t(`roles.${key}.title`)}
                      </h3>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {t(`roles.${key}.body`)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700 dark:bg-neutral-800/40">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('locationTitle')}</h3>
              {lokasi.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {profil.pekon && (
                    <li>
                      <span className="text-neutral-500">{t('location.pekon')}:</span> {profil.pekon}
                    </li>
                  )}
                  {profil.kecamatan && (
                    <li>
                      <span className="text-neutral-500">{t('location.kecamatan')}:</span> {profil.kecamatan}
                    </li>
                  )}
                  {profil.kabupaten && (
                    <li>
                      <span className="text-neutral-500">{t('location.kabupaten')}:</span> {profil.kabupaten}
                    </li>
                  )}
                  {profil.provinsi && (
                    <li>
                      <span className="text-neutral-500">{t('location.provinsi')}:</span> {profil.provinsi}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">{t('locationEmpty')}</p>
              )}
            </div>
            <Link
              href={`/${desa}/panduan`}
              className="block rounded-2xl bg-primary-700 px-5 py-4 text-center text-sm font-semibold text-white hover:bg-primary-600 dark:bg-primary-600"
            >
              {t('panduanCta')}
            </Link>
          </aside>
        </div>
      </div>
    </div>
  )
}
