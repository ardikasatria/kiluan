'use client'

import type { DashboardNavItem } from '@/lib/kiluan/dashboard-peran'
import { labelPeran, slugPeran, type PeranKode } from '@/lib/kiluan/peran'
import { RUTE_DASBOR_WISATAWAN } from '@/lib/kiluan/rute-sigerciv'
import { Link, usePathname } from '@/i18n/navigation'
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  HomeIcon,
  MapIcon,
  ShoppingBagIcon,
  TicketIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ComponentType } from 'react'

const NAV_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  ringkasan: HomeIcon,
  rencana: ClipboardDocumentListIcon,
  booking: TicketIcon,
  paspor: ClipboardDocumentListIcon,
  kontribusi: UserGroupIcon,
  destinasi: MapIcon,
  kurasi: ClipboardDocumentListIcon,
  keanggotaan: UsersIcon,
  dana: BanknotesIcon,
  produk: ShoppingBagIcon,
  pesanan: TicketIcon,
  performa: ChartBarIcon,
  sertifikasi: ChartBarIcon,
  paket: GlobeAltIcon,
  jadwal: ClipboardDocumentListIcon,
  lencana: ChartBarIcon,
  leaderboard: ChartBarIcon,
  program: GlobeAltIcon,
  ekologi: ChartBarIcon,
  sponsor: BanknotesIcon,
  verifikasi: UsersIcon,
  kebijakan: ClipboardDocumentListIcon,
  transparansi: BanknotesIcon,
  kelola: Cog6ToothIcon,
  operasional: Cog6ToothIcon,
  tenant: BuildingOffice2Icon,
  moderasi: UsersIcon,
  sistem: Cog6ToothIcon,
  nusantara: GlobeAltIcon,
}

interface Props {
  desaSlug: string
  peran: PeranKode
  nav: DashboardNavItem[]
  tagline: string
  compact?: boolean
}

export default function DashboardSidebar({ desaSlug, peran, nav, tagline, compact }: Props) {
  const pathname = usePathname()
  const t = useTranslations('dasbor.view')
  const tPeran = useTranslations('peran')
  const base =
    peran === 'admin'
      ? '/admin/dasbor'
      : peran === 'wisatawan'
        ? RUTE_DASBOR_WISATAWAN
        : `/${desaSlug}/dasbor/${slugPeran(peran)}`

  return (
    <div className={clsx('flex h-full flex-col p-4', compact ? 'p-3' : 'lg:p-5')}>
      {!compact && (
        <div className="mb-5 hidden lg:block">
          <p className="text-xs font-medium tracking-wide text-primary-600 uppercase dark:text-primary-400">
            {t('navigasi')}
          </p>
          <h2 className="mt-1 text-base font-bold text-primary-800 dark:text-primary-100">{labelPeran(peran, tPeran)}</h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{tagline}</p>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-0.5" aria-label={t('navLabel', { peran: labelPeran(peran, tPeran) })}>
        {nav.map((item) => {
          const href = item.href ?? `${base}${item.segment}`
          const aktif = item.href
            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
            : item.segment === ''
              ? pathname === base
              : pathname.startsWith(href)
          const Icon = NAV_ICONS[item.id] ?? HomeIcon
          return (
            <Link
              key={item.id}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                aktif
                  ? 'bg-primary-700 text-white shadow-sm dark:bg-primary-600'
                  : 'text-neutral-700 hover:bg-kiluan-mint/15 hover:text-primary-800 dark:text-neutral-300 dark:hover:bg-primary-900/40 dark:hover:text-primary-100',
              )}
            >
              <Icon className="size-5 shrink-0 opacity-80" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.segera && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                  {t('segera')}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
