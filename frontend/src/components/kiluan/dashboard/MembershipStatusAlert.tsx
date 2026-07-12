import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { Link } from '@/i18n/navigation'
import { RUTE_GABUNG, RUTE_WISATAWAN } from '@/lib/kiluan/rute-sigerciv'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'

interface Props {
  status: 'menunggu' | 'ditolak' | 'revisi'
  peranLabel: string
  desaNama: string
}

export default function MembershipStatusAlert({ status, peranLabel, desaNama }: Props) {
  const t = useTranslations('dasbor.membership')
  const ditolak = status === 'ditolak'
  const revisi = status === 'revisi'

  return (
    <div
      className={clsx(
        'rounded-2xl border p-5 sm:p-6',
        ditolak || revisi
          ? 'border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30'
          : 'border-amber-200 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/25',
      )}
      role="alert"
    >
      <div className="flex gap-3">
        {ditolak || revisi ? (
          <ExclamationTriangleIcon className="size-6 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
        ) : (
          <InformationCircleIcon className="size-6 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-primary-800 dark:text-primary-100">
            {ditolak || revisi ? t('ditolakTitle') : t('menungguTitle')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {ditolak || revisi
              ? t('ditolakDesc', { peran: peranLabel, desa: desaNama })
              : t('menungguDesc', { peran: peranLabel, desa: desaNama })}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {ditolak || revisi ? (
              <Link
                href={RUTE_GABUNG}
                className="inline-flex rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
              >
                {t('ctaAjukanBaru')}
              </Link>
            ) : (
              <Link
                href={`${RUTE_WISATAWAN.akun}#keanggotaan`}
                className="inline-flex rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
              >
                {t('ctaLihatStatus')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
