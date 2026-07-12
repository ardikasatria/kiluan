'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { Link, usePathname } from '@/i18n/navigation'
import { navKelolaTerlihat } from '@/lib/kiluan/kelola-akses'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'

const ITEMS = [
  { href: '', key: 'ringkasan' },
  { href: '/destinasi', key: 'destinasi' },
  { href: '/layanan', key: 'layanan' },
  { href: '/kalender', key: 'kalender' },
  { href: '/berita', key: 'berita' },
  { href: '/slot', key: 'slot' },
  { href: '/pesanan', key: 'pesanan' },
  { href: '/bendahara', key: 'bendahara' },
  { href: '/pembayaran', key: 'pembayaran' },
  { href: '/payout', key: 'payout' },
  { href: '/transaksi', key: 'transaksi' },
  { href: '/pendapatan', key: 'pendapatan' },
  { href: '/refund', key: 'refund' },
  { href: '/hadiah', key: 'hadiah' },
  { href: '/kupon', key: 'kupon' },
  { href: '/checkin', key: 'checkin' },
  { href: '/pengaturan', key: 'pengaturan' },
  { href: '/kurasi', key: 'kurasi' },
  { href: '/keanggotaan', key: 'keanggotaan' },
  { href: '/umkm', key: 'umkm' },
  { href: '/misi', key: 'misi' },
  { href: '/stasiun', key: 'stasiun' },
  { href: '/poin', key: 'poin' },
  { href: '/validasi-kartu', key: 'validasiKartu' },
  { href: '/verifikasi', key: 'verifikasi' },
] as const

interface Props {
  desaSlug: string
  desaId?: string | null
}

export default function KelolaNav({ desaSlug, desaId }: Props) {
  const pathname = usePathname()
  const t = useTranslations('kelola.nav')
  const { user } = useAuth()
  const profil = user?.profil ?? null
  const base = `/${desaSlug}/kelola`

  const terlihat = ITEMS.filter((item) => navKelolaTerlihat(profil, item.key, desaId))

  if (terlihat.length === 0) return null

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px dark:border-neutral-700"
      aria-label={t('ariaLabel')}
    >
      {terlihat.map((item) => {
        const href = `${base}${item.href}`
        const aktif = item.href === '' ? pathname === base : pathname.startsWith(href)
        return (
          <Link
            key={item.href}
            href={href}
            className={clsx(
              'shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition',
              aktif
                ? 'border-b-2 border-primary-600 text-primary-800 dark:border-primary-400 dark:text-primary-100'
                : 'text-neutral-600 hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-300',
            )}
          >
            {t(item.key)}
          </Link>
        )
      })}
    </nav>
  )
}
