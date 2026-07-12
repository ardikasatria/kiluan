import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface Props {
  status: 'menunggu' | 'ditolak'
  peranLabel: string
  desaNama: string
}

export default function MembershipStatusAlert({ status, peranLabel, desaNama }: Props) {
  const ditolak = status === 'ditolak'

  return (
    <div
      className={clsx(
        'rounded-2xl border p-5 sm:p-6',
        ditolak
          ? 'border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30'
          : 'border-amber-200 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/25',
      )}
      role="alert"
    >
      <div className="flex gap-3">
        {ditolak ? (
          <ExclamationTriangleIcon className="size-6 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
        ) : (
          <InformationCircleIcon className="size-6 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        )}
        <div>
          <h2 className="font-semibold text-primary-800 dark:text-primary-100">
            {ditolak ? 'Keanggotaan ditolak' : 'Keanggotaan menunggu persetujuan'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {ditolak
              ? `Permintaan peran ${peranLabel} di ${desaNama} tidak disetujui. Hubungi Pokdarwis atau perangkat desa jika perlu klarifikasi.`
              : `Peran ${peranLabel} di ${desaNama} sedang ditinjau. Modul kelola akan tersedia setelah keanggotaan aktif.`}
          </p>
        </div>
      </div>
    </div>
  )
}
