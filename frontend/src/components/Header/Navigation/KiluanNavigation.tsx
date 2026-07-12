'use client'

import type { TNavigationFeatured, TNavigationItem } from '@/data/navigation'
import { usePathname } from '@/i18n/navigation'
import { ikonNavigasi } from '@/lib/kiluan/navigation-icons'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FC, useCallback, useEffect, useRef, useState } from 'react'

function SoonBadge() {
  const t = useTranslations('common')
  return (
    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      {t('soon')}
    </span>
  )
}

function FeaturedCard({ featured, onNavigate }: { featured: TNavigationFeatured; onNavigate: () => void }) {
  return (
    <article className="group relative flex flex-col items-start justify-between">
      {featured.image ? (
        <div className="relative w-full">
          <Image
            src={featured.image}
            alt=""
            width={400}
            height={300}
            className="aspect-square w-full rounded-2xl object-cover brightness-100 transition-[filter] duration-300 group-hover:brightness-90 sm:aspect-3/2"
          />
          {featured.badge ? (
            <span className="absolute top-3 left-3 rounded-full bg-primary-700/90 px-2.5 py-0.5 text-xs font-medium text-white">
              {featured.badge}
            </span>
          ) : null}
          <Link href={featured.href} className="absolute inset-0" onClick={onNavigate} />
        </div>
      ) : null}
      <div className="max-w-xl">
        {!featured.image && featured.badge ? (
          <span className="mt-3.5 inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {featured.badge}
          </span>
        ) : null}
        <div className="group relative">
          <h3 className="mt-2 text-sm/normal font-semibold text-neutral-900 dark:text-neutral-100">
            <Link href={featured.href} onClick={onNavigate}>
              <span className="absolute inset-0" />
              {featured.title}
            </Link>
          </h3>
          <p className="mt-2.5 line-clamp-2 text-sm/6 text-neutral-600 dark:text-neutral-400">
            {featured.description}
          </p>
        </div>
      </div>
    </article>
  )
}

const btnClass =
  'kiluan-nav-btn flex items-center self-center rounded-full px-3 py-2.5 text-sm font-medium whitespace-nowrap text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 lg:text-[15px] xl:px-4 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'

const Lv1MenuItem = ({
  menuItem,
  isOpen,
  onToggle,
}: {
  menuItem: TNavigationItem
  isOpen: boolean
  onToggle: () => void
}) => {
  const hasChildren = Boolean(menuItem.children?.length)

  if (hasChildren) {
    return (
      <button
        type="button"
        className={clsx(btnClass, isOpen && 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100')}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        {menuItem.name}
        <ChevronDownIcon
          className={clsx('ms-1 -me-1 size-4 text-neutral-400 transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
    )
  }

  return (
    <Link className={btnClass} href={menuItem.href || '#'}>
      {menuItem.name}
    </Link>
  )
}

function SubMenuLink({ item, onNavigate }: { item: TNavigationItem; onNavigate: () => void }) {
  const Icon = ikonNavigasi(item.icon)

  return (
    <li key={item.id} className={clsx('menu-item', item.isNew && 'menuIsNew')}>
      <Link
        href={item.href || '#'}
        onClick={onNavigate}
        className="group -mx-2 flex items-start gap-2.5 rounded-xl px-2 py-2 transition hover:bg-neutral-50 dark:hover:bg-neutral-800/80"
      >
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-primary-600 dark:bg-neutral-800 dark:text-primary-400">
            <Icon className="size-[18px]" aria-hidden />
          </span>
        ) : null}
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-normal text-neutral-700 group-hover:text-neutral-900 dark:text-neutral-300 dark:group-hover:text-white">
            {item.name}
            {item.soon ? <SoonBadge /> : null}
          </span>
          {item.description ? (
            <span className="mt-0.5 block text-xs leading-snug text-neutral-500 dark:text-neutral-400">
              {item.description}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  )
}

const MegaMenu = ({
  menuItem,
  isOpen,
  onToggle,
  onClose,
}: {
  menuItem: TNavigationItem
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}) => {
  const kolom = menuItem.children?.length ?? 0
  const gridKolom =
    kolom >= 4 ? 'grid-cols-4' : kolom === 3 ? 'grid-cols-3' : kolom === 2 ? 'grid-cols-2' : 'grid-cols-1'

  return (
    <li className={clsx('menu-megamenu flex', isOpen && 'is-open')}>
      <Lv1MenuItem menuItem={menuItem} isOpen={isOpen} onToggle={onToggle} />

      {menuItem.children?.length && menuItem.type === 'mega-menu' ? (
        <div
          className={clsx(
            'header-popover-full-panel absolute top-full right-0 left-0 z-40 w-full',
            isOpen ? 'block' : 'hidden',
          )}
          role="region"
          aria-hidden={!isOpen}
        >
          <div className="border-t border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <div className="container">
              <div className="flex gap-8 py-10 text-sm xl:gap-10 xl:py-11">
                <div className={clsx('grid min-w-0 flex-1 gap-6 xl:gap-8', gridKolom)}>
                  {menuItem.children.map((menuChild) => (
                    <div key={menuChild.id} className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-neutral-200">{menuChild.name}</p>
                      <ul className="mt-4 grid space-y-1">
                        {menuChild.children?.map((item) => (
                          <SubMenuLink key={item.id} item={item} onNavigate={onClose} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {menuItem.featured ? (
                  <div className="hidden w-64 shrink-0 xl:block xl:w-72 2xl:w-80">
                    <FeaturedCard featured={menuItem.featured} onNavigate={onClose} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export interface Props {
  menu: TNavigationItem[]
  className?: string
}

const KiluanNavigation: FC<Props> = ({ menu, className }) => {
  const [openId, setOpenId] = useState<string | null>(null)
  const navRef = useRef<HTMLUListElement>(null)
  const pathname = usePathname()

  const close = useCallback(() => setOpenId(null), [])

  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }, [])

  useEffect(() => {
    close()
  }, [pathname, close])

  useEffect(() => {
    if (!openId) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        close()
      }
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClickOutside)
    }
  }, [openId, close])

  return (
    <ul ref={navRef} className={clsx('kiluan-nav flex flex-nowrap items-center', className)}>
      {menu.map((menuItem) => (
        <MegaMenu
          key={menuItem.id}
          menuItem={menuItem}
          isOpen={openId === menuItem.id}
          onToggle={() => {
            if (menuItem.id) toggle(menuItem.id)
          }}
          onClose={close}
        />
      ))}
    </ul>
  )
}

export default KiluanNavigation
