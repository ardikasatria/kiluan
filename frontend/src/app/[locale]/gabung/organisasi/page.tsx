import { Link } from '@/i18n/navigation'
import { RUTE_DASBOR_WISATAWAN } from '@/lib/kiluan/rute-sigerciv'
import { buatMetadata } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('gabung.organisasi')
  return buatMetadata({
    judul: t('title'),
    deskripsi: t('desc'),
    path: '/gabung/organisasi',
    gambar: '/gallery/laguna.jpg',
  })
}

/** Placeholder onboarding organisasi — form penuh menyusul di rute global. */
export default async function GabungOrganisasiPage() {
  const t = await getTranslations('gabung.organisasi')

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800/60">
      <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-100">{t('title')}</h1>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t('desc')}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`${RUTE_DASBOR_WISATAWAN}/peran`}
          className="inline-flex rounded-xl bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 dark:bg-primary-600"
        >
          {t('ctaStatus')}
        </Link>
        <Link
          href="/saya/akun#keanggotaan"
          className="inline-flex rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200"
        >
          {t('ctaAkun')}
        </Link>
      </div>
    </div>
  )
}
