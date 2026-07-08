import { TNavigationItem } from '@/data/navigation'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Link from 'next/link'
import { FC } from 'react'

const Lv1MenuItem = ({ menuItem }: { menuItem: TNavigationItem }) => {
  return (
    <span
      className={clsx(
        'flex cursor-pointer items-center self-center rounded-full px-4 py-2.5 text-sm font-bold whitespace-nowrap text-primary-800 transition-colors lg:text-[15px] xl:px-5',
        'hover:bg-primary-50 hover:text-primary-900 dark:text-primary-100 dark:hover:bg-primary-900/40 dark:hover:text-white'
      )}
    >
      {menuItem.name}
      {menuItem.children?.length ? (
        <ChevronDownIcon className="ms-1 -me-1 size-4 text-primary-400" aria-hidden="true" />
      ) : null}
    </span>
  )
}

const MegaMenu = ({ menuItem }: { menuItem: TNavigationItem }) => {
  const renderNavlink = (item: TNavigationItem) => (
    <li key={item.id} className={clsx('menu-item', item.isNew && 'menuIsNew')}>
      <Link
        className="font-normal text-neutral-600 transition-colors hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-200"
        href={item.href || '#'}
      >
        {item.name}
      </Link>
    </li>
  )

  return (
    <li className={clsx('menu-megamenu menu-item flex', menuItem.isNew && 'menuIsNew_lv1')}>
      <Lv1MenuItem menuItem={menuItem} />

      {menuItem.children?.length && menuItem.type === 'mega-menu' ? (
        <div className="sub-menu absolute inset-x-0 top-full z-50">
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
  return (
    <ul className={clsx('flex items-center gap-x-1', className)}>
      {menu.map((menuItem) => (
        <MegaMenu key={menuItem.id} menuItem={menuItem} />
      ))}
    </ul>
  )
}

export default KiluanNavigation
