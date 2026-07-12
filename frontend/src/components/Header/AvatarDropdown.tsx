'use client'

import KiluanAvatar from '@/components/kiluan/KiluanAvatar'
import { useDesaSlug } from '@/contexts/DesaKonteksProvider'
import { useAuth } from '@/contexts/AuthProvider'
import { adalahPengelola } from '@/lib/api/auth'
import { RUTE_WISATAWAN, ruteSaya } from '@/lib/kiluan/rute-sigerciv'
import { dasborUtamaHref, punyaPeran } from '@/lib/kiluan/peran'
import ButtonCircle from '@/shared/ButtonCircle'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import {
  BookOpen01Icon,
  HeartAddIcon,
  Logout01Icon,
  PassportIcon,
  Settings02Icon,
  ShoppingBag01Icon,
  Task01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'

interface Props {
  className?: string
}

function BadgeSegera() {
  return (
    <span className="ms-auto rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
      segera
    </span>
  )
}

interface ItemMenu {
  href?: string
  label: string
  icon: typeof UserIcon
  segera?: boolean
  onClick?: () => void
  tampil?: boolean
}

export default function AvatarDropdown({ className }: Props) {
  const { user, logout, isLoggedIn } = useAuth()
  const desaSlug = useDesaSlug()
  const dasborHref = dasborUtamaHref(user?.profil ?? null, desaSlug)

  if (!isLoggedIn || !user) return null

  const profil = user.profil
  const wisatawan = punyaPeran(profil, 'wisatawan')
  const pengelola = adalahPengelola(profil)

  const itemClass =
    '-m-2 flex w-full items-center gap-x-3 rounded-lg px-2 py-2.5 text-start text-sm transition duration-150 ease-in-out hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:hover:bg-neutral-700'

  const menuItems: ItemMenu[] = [
    { href: dasborHref, label: 'Dasbor saya', icon: UserIcon, tampil: true },
    {
      href: RUTE_WISATAWAN.paspor,
      label: 'Paspor Lestari',
      icon: PassportIcon,
      tampil: wisatawan,
    },
    {
      href: RUTE_WISATAWAN.wishlist,
      label: 'Wishlist saya',
      icon: HeartAddIcon,
      tampil: wisatawan,
    },
    {
      href: '#',
      label: 'Pesanan / Booking saya',
      icon: ShoppingBag01Icon,
      segera: true,
      tampil: wisatawan || punyaPeran(profil, 'agen'),
    },
    {
      href: RUTE_WISATAWAN.discovery,
      label: 'Kontribusi saya',
      icon: Task01Icon,
      tampil: wisatawan || punyaPeran(profil, 'kontributor'),
    },
    {
      href: ruteSaya('lencana'),
      label: 'Poin & Lencana',
      icon: Task01Icon,
      segera: true,
      tampil: wisatawan,
    },
    {
      href: RUTE_WISATAWAN.akun,
      label: 'Akun & Preferensi',
      icon: Settings02Icon,
      tampil: true,
    },
    {
      href: `${RUTE_WISATAWAN.akun}#bantuan`,
      label: 'Panduan & Bantuan',
      icon: BookOpen01Icon,
      tampil: true,
    },
    {
      href: `/${desaSlug}/kelola`,
      label: 'Kelola desa',
      icon: Task01Icon,
      tampil: pengelola,
    },
  ]

  return (
    <div className={className}>
      <Popover>
        {({ close }) => (
          <>
            <PopoverButton
              as={ButtonCircle}
              className="relative"
              plain
              aria-label="Menu pengguna"
              aria-haspopup="menu"
            >
              <KiluanAvatar nama={user.name} src={user.avatar} width={32} height={32} className="size-8" />
            </PopoverButton>

            <PopoverPanel
              transition
              anchor={{ to: 'bottom end', gap: 12 }}
              className="z-40 w-[min(100vw-2rem,20rem)] rounded-2xl shadow-xl ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0 dark:ring-white/10"
            >
              <div
                role="menu"
                aria-label="Menu akun"
                className="flex flex-col gap-y-1 bg-white px-4 py-5 dark:bg-neutral-900"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') close()
                }}
              >
                {/* Identitas */}
                <div className="flex items-center gap-x-3 px-1 pb-3">
                  <KiluanAvatar nama={user.name} src={user.avatar} width={48} height={48} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</h4>
                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
                    {wisatawan && (
                      <Link
                        href={RUTE_WISATAWAN.wishlist}
                        className="mt-0.5 inline-block text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                        onClick={() => close()}
                      >
                        Wishlist saya →
                      </Link>
                    )}
                  </div>
                </div>

                <Divider className="my-1" />

                {menuItems
                  .filter((item) => item.tampil !== false)
                  .map((item) =>
                    item.href ? (
                      <Link
                        key={item.label}
                        href={item.segera ? '#' : item.href}
                        role="menuitem"
                        onClick={(e) => {
                          if (item.segera) e.preventDefault()
                          else close()
                        }}
                        className={clsx(itemClass, item.segera && 'cursor-default opacity-80')}
                        aria-disabled={item.segera}
                      >
                        <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.5} className="shrink-0 text-neutral-600 dark:text-neutral-400" />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{item.label}</span>
                        {item.segera ? <BadgeSegera /> : null}
                      </Link>
                    ) : null,
                  )}

                <Divider className="my-1" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close()
                    void logout()
                  }}
                  className={itemClass}
                >
                  <HugeiconsIcon icon={Logout01Icon} size={20} strokeWidth={1.5} className="shrink-0 text-neutral-600 dark:text-neutral-400" />
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">Keluar</span>
                </button>
              </div>
            </PopoverPanel>
          </>
        )}
      </Popover>
    </div>
  )
}
