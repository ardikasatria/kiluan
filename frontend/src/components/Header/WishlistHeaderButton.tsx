'use client'

import { RUTE_WISATAWAN } from '@/lib/kiluan/rute-sigerciv'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  className?: string
}

export default function WishlistHeaderButton({ className }: Props) {
  const pathname = usePathname()
  const href = RUTE_WISATAWAN.wishlist
  const aktif = pathname.startsWith(href)

  return (
    <Link
      href={href}
      aria-label="Wishlist saya"
      title="Wishlist saya"
      className={clsx(
        'relative inline-flex size-10 items-center justify-center rounded-full transition hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none md:size-11 dark:hover:bg-neutral-800',
        aktif && 'bg-primary-50 dark:bg-primary-900/40',
        className,
      )}
    >
      {aktif ? (
        <HeartSolidIcon className="size-6 text-primary-600 dark:text-primary-400" aria-hidden />
      ) : (
        <HeartIcon className="size-6 text-neutral-700 dark:text-neutral-200" aria-hidden />
      )}
    </Link>
  )
}
