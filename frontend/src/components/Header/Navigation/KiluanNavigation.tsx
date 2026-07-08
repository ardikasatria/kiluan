'use client'

import { TNavigationItem } from '@/data/navigation'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Link from 'next/link'
import { FC, useEffect, useRef, useState } from 'react'

const MegaMenu = ({
  menuItem,
  isOpen,
  onToggle,
}: {
  menuItem: TNavigationItem
  isOpen: boolean
  onToggle: (id: string) => void
}) => {
  const itemId = menuItem.id ?? menuItem.name ?? 'menu'

  const renderNavlink = (item: TNavigationItem) => (
    <li key={item.id} className={clsx('menu-item', item.isNew && 'menuIsNew')}>
      <Link
        className="font-normal text-neutral-600 transition-colors hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-200"
        href={item.href || '#'}
        onClick={() => onToggle(itemId)}
      >
        {item.name}
      </Link>
    </li>
  )

  return (
    <li className={clsx('flex', menuItem.isNew && 'menuIsNew_lv1')}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => onToggle(itemId)}
        className={clsx(
          'flex cursor-pointer items-center self-center rounded-full px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors lg:text-[15px] xl:px-5',
          isOpen
            ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/40 dark:text-white'
            : 'text-primary-800 hover:bg-primary-50 hover:text-primary-900 dark:text-primary-100 dark:hover:bg-primary-900/40 dark:hover:text-white'
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
          className={clsx(
            'absolute inset-x-0 top-full z-50 pt-1',
            isOpen ? 'block' : 'hidden'
          )}
        >
          <div className="border-t border-primary-100 bg-white shadow-lg dark:border-primary-900/50 dark:bg-neutral-900">
            <div className="container">
              <div className="flex gap-8 py-10 text-sm">
                <div className="hidden w-48 shrink-0 border-e border-primary-100 pe-8 xl:block dark:border-primary-900/50">
                  <p className="text-xs font-semibold tracking-wider text-primary-500 uppercase">Modul</p>
                  <p className="mt-2 text-lg font-semibold text-primary-800 dark:text-primary-100">{menuItem.name}</p>
                  {menuItem.description ? (
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{menuItem.description}</p>
                  ) : null}
                </div>

                <div className="grid flex-1 grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {menuItem.children.map((menuChild) => (
                    <div key={menuChild.id}>
                      <p className="font-semibold text-primary-800 dark:text-primary-100">{menuChild.name}</p>
                      <ul className="mt-4 grid space-y-3">{menuChild.children?.map(renderNavlink)}</ul>
                    </div>
                  ))}
                </div>
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
    <ul ref={navRef} className={clsx('flex items-center gap-x-1', className)}>
      {menu.map((menuItem) => {
        const itemId = menuItem.id ?? menuItem.name ?? 'menu'
        return (
          <MegaMenu key={itemId} menuItem={menuItem} isOpen={openId === itemId} onToggle={handleToggle} />
        )
      })}
    </ul>
  )
}

export default KiluanNavigation
