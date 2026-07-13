'use client'

import type { DashboardNavItem, ZonaDasbor, ZonaDasborOrganisasi, ZonaDasborPengelola, ZonaDasborPenyedia } from '@/lib/kiluan/dashboard-peran'
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
  HeartIcon,
  HomeIcon,
  IdentificationIcon,
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
  jelajah: MapIcon,
  wishlist: HeartIcon,
  akun: Cog6ToothIcon,
  paspor: IdentificationIcon,
  kontribusi: UserGroupIcon,
  destinasi: MapIcon,
  kurasi: ClipboardDocumentListIcon,
  keanggotaan: UsersIcon,
  dana: BanknotesIcon,
  produk: ShoppingBagIcon,
  pesanan: TicketIcon,
  performa: ChartBarIcon,
  sertifikasi: ChartBarIcon,
  pendapatan: BanknotesIcon,
  paket: GlobeAltIcon,
  jadwal: ClipboardDocumentListIcon,
  lencana: ChartBarIcon,
  leaderboard: ChartBarIcon,
  program: GlobeAltIcon,
  monitoring: ChartBarIcon,
  neraca: ChartBarIcon,
  laporan: ClipboardDocumentListIcon,
  ekologi: ChartBarIcon,
  sponsor: BanknotesIcon,
  verifikasi: UsersIcon,
  validasi: IdentificationIcon,
  data: ChartBarIcon,
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
  onNavigate?: () => void
}

function NavLink({
  item,
  base,
  pathname,
  onNavigate,
  t,
}: {
  item: DashboardNavItem
  base: string
  pathname: string
  onNavigate?: () => void
  t: ReturnType<typeof useTranslations<'dasbor.view'>>
}) {
  const href = item.href ?? `${base}${item.segment}`
  const aktif = item.href
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : item.segment === ''
      ? pathname === base
      : pathname.startsWith(href)
  const Icon = NAV_ICONS[item.id] ?? HomeIcon

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={clsx(
        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        aktif
          ? 'bg-primary-700 text-white shadow-sm dark:bg-primary-600'
          : 'text-neutral-700 hover:bg-kiluan-mint/15 hover:text-primary-800 dark:text-neutral-300 dark:hover:bg-primary-900/40 dark:hover:text-primary-100',
      )}
    >
      <Icon className="size-5 shrink-0 opacity-80" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.segera ? (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
          {t('segera')}
        </span>
      ) : null}
    </Link>
  )
}

export default function DashboardSidebar({ desaSlug, peran, nav, tagline, compact, onNavigate }: Props) {
  const pathname = usePathname()
  const t = useTranslations('dasbor.view')
  const tZonaPengelola = useTranslations('dasbor.pengelola.zona')
  const tZonaPenyedia = useTranslations('dasbor.penyedia.zona')
  const tZonaOrganisasi = useTranslations('dasbor.organisasi.zona')
  const tPeran = useTranslations('peran')
  const base =
    peran === 'admin'
      ? '/admin/dasbor'
      : peran === 'wisatawan'
        ? RUTE_DASBOR_WISATAWAN
        : `/${desaSlug}/dasbor/${slugPeran(peran)}`

  const zonaPengelola = peran === 'kontributor' && nav.some((n) => n.zona === 'saya' || n.zona === 'kelola')
  const zonaPenyedia = (peran === 'umkm' || peran === 'agen') && nav.some((n) => n.zona === 'katalog' || n.zona === 'operasional')
  const zonaOrganisasi = peran === 'organisasi' && nav.some((n) => n.zona === 'lapangan' || n.zona === 'program')
  const ringkasan = nav.filter((n) => !n.zona)
  const navZonaPengelola = (z: ZonaDasborPengelola) => nav.filter((n) => n.zona === z)
  const navZonaPenyedia = (z: ZonaDasborPenyedia) => nav.filter((n) => n.zona === z)
  const navZonaOrganisasi = (z: ZonaDasborOrganisasi) => nav.filter((n) => n.zona === z)

  function renderZonaGrouped(
    zones: { id: ZonaDasbor; label: string }[],
    filter: (z: ZonaDasbor) => DashboardNavItem[],
  ) {
    return (
      <>
        {ringkasan.map((item) => (
          <NavLink key={item.id} item={item} base={base} pathname={pathname} onNavigate={onNavigate} t={t} />
        ))}
        {zones.map(({ id, label }) => {
          const items = filter(id)
          if (items.length === 0) return null
          return (
            <div key={id}>
              <p className="mt-3 mb-1 px-3 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                {label}
              </p>
              {items.map((item) => (
                <NavLink key={item.id} item={item} base={base} pathname={pathname} onNavigate={onNavigate} t={t} />
              ))}
            </div>
          )
        })}
      </>
    )
  }

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
        {zonaPengelola
          ? renderZonaGrouped(
              [
                { id: 'saya', label: tZonaPengelola('saya') },
                { id: 'kelola', label: tZonaPengelola('kelola') },
              ],
              (z) => navZonaPengelola(z as ZonaDasborPengelola),
            )
          : zonaPenyedia
            ? renderZonaGrouped(
                [
                  { id: 'katalog', label: tZonaPenyedia('katalog') },
                  { id: 'operasional', label: tZonaPenyedia('operasional') },
                ],
                (z) => navZonaPenyedia(z as ZonaDasborPenyedia),
              )
            : zonaOrganisasi
              ? renderZonaGrouped(
                  [
                    { id: 'lapangan', label: tZonaOrganisasi('lapangan') },
                    { id: 'program', label: tZonaOrganisasi('program') },
                  ],
                  (z) => navZonaOrganisasi(z as ZonaDasborOrganisasi),
                )
              : nav.map((item) => (
                <NavLink key={item.id} item={item} base={base} pathname={pathname} onNavigate={onNavigate} t={t} />
              ))}
      </nav>
    </div>
  )
}
