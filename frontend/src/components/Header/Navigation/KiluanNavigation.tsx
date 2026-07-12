'use client'

import type { TNavigationFeatured, TNavigationItem } from '@/data/navigation'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { FC, useEffect, useId, useRef, useState } from 'react'

function FeaturedTile({ featured }: { featured: TNavigationFeatured }) {
  return (
    <Link
      href={featured.href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-primary-200/70 bg-gradient-to-br from-kiluan-mint/20 via-white to-primary-50 transition hover:border-kiluan-sea hover:shadow-md dark:border-primary-700/50 dark:from-primary-900/40 dark:via-neutral-900 dark:to-kiluan-navy/30"
    >
      {featured.image ? (
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={featured.image}
            alt=""
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="240px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 to-transparent" />
          {featured.badge ? (
            <span className="absolute top-3 left-3 rounded-full bg-kiluan-sea/90 px-2.5 py-0.5 text-xs font-medium text-white">
              {featured.badge}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        {!featured.image && featured.badge ? (
          <span className="mb-2 inline-flex w-fit rounded-full bg-kiluan-mint/30 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-800/60 dark:text-kiluan-mint">
            {featured.badge}
          </span>
        ) : null}
        <p className="font-semibold text-primary-800 group-hover:text-primary-600 dark:text-primary-100">
          {featured.title}
        </p>
        <p className="mt-1 flex-1 text-sm text-neutral-600 dark:text-neutral-400">{featured.description}</p>
        <span className="mt-3 text-sm font-semibold text-primary-700 dark:text-kiluan-mint">Lihat →</span>
      </div>
    </Link>
  )
}

const MegaMenu = ({
  menuItem,
  isOpen,
  onToggle,
  panelId,
}: {
  menuItem: TNavigationItem
  isOpen: boolean
  onToggle: (id: string) => void
  panelId: string
}) => {
  const itemId = menuItem.id ?? menuItem.name ?? 'menu'

  const renderNavlink = (item: TNavigationItem) => (
    <li key={item.id} className={clsx('menu-item', item.isNew && 'menuIsNew')}>
      <Link
        className="inline-flex items-center gap-2 font-normal text-neutral-600 transition-colors hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-200"
        href={item.href || '#'}
        onClick={() => onToggle(itemId)}
      >
        {item.name}
        {item.soon ? (
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            segera
          </span>
        ) : null}
      </Link>
    </li>
  )

  return (
    <li className={clsx('flex', menuItem.isNew && 'menuIsNew_lv1')}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => onToggle(itemId)}
        className={clsx(
          'kiluan-nav-btn flex cursor-pointer items-center self-center rounded-full px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors lg:text-[15px] xl:px-5',
          isOpen
            ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/40 dark:text-white'
            : 'text-primary-800 hover:bg-primary-50 hover:text-primary-900 dark:text-primary-100 dark:hover:bg-primary-900/40 dark:hover:text-white',
        )}
      >
        {menuItem.name}
        {menuItem.children?.length ? (
          <ChevronDownIcon
            className={clsx('ms-1 -me-1 size-4 text-primary-400 transition-transform', isOpen && 'rotate-180')}
            aria-hidden="true"
          />
        ) : null}
      </button>

      {menuItem.children?.length && menuItem.type === 'mega-menu' ? (
        <div
          id={panelId}
          role="region"
          aria-label={`Menu ${menuItem.name}`}
          className={clsx('absolute inset-x-0 top-full z-50 pt-1', isOpen ? 'block' : 'hidden')}
        >
          <div className="border-t border-neutral-200/70 bg-white/90 backdrop-blur-xl backdrop-saturate-150 dark:border-primary-900/50 dark:bg-neutral-900/95">
            <div className="container">
              <div className="flex gap-8 py-10 text-sm">
                <div className="hidden w-44 shrink-0 border-e border-primary-100 pe-8 xl:block dark:border-primary-900/50">
                  <p className="text-xs font-semibold tracking-wider text-primary-500 uppercase">Navigasi</p>
                  <p className="mt-2 text-lg font-semibold text-primary-800 dark:text-primary-100">{menuItem.name}</p>
                  {menuItem.description ? (
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{menuItem.description}</p>
                  ) : null}
                </div>

                <div className="grid flex-1 grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {menuItem.children.map((menuChild) => (
                    <div key={menuChild.id}>
                      <p className="font-semibold text-primary-800 dark:text-primary-100">{menuChild.name}</p>
                      <ul className="mt-4 grid space-y-3">{menuChild.children?.map(renderNavlink)}</ul>
                    </div>
                  ))}
                </div>

                {menuItem.featured ? (
                  <div className="hidden w-56 shrink-0 xl:block 2xl:w-64">
                    <p className="mb-3 text-xs font-semibold tracking-wider text-primary-500 uppercase">Unggulan</p>
                    <FeaturedTile featured={menuItem.featured} />
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
  const baseId = useId()

  const handleToggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id))
  }

  useEffect(() => {
    if (!openId) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenId(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenId(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openId])

  return (
    <ul ref={navRef} className={clsx('kiluan-nav relative flex items-center gap-x-1', className)} role="menubar">
      {menu.map((menuItem, index) => {
        const itemId = menuItem.id ?? menuItem.name ?? 'menu'
        return (
          <MegaMenu
            key={itemId}
            menuItem={menuItem}
            isOpen={openId === itemId}
            onToggle={handleToggle}
            panelId={`${baseId}-panel-${index}`}
          />
        )
      })}
    </ul>
  )
}

export default KiluanNavigation
