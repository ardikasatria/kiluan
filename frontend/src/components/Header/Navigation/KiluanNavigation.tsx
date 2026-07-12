'use client'

import type { TNavigationFeatured, TNavigationItem } from '@/data/navigation'
import { ikonNavigasi } from '@/lib/kiluan/navigation-icons'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'

function SoonBadge() {
  return (
    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      segera
    </span>
  )
}

function FeaturedCard({ featured }: { featured: TNavigationFeatured }) {
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
          <Link href={featured.href} className="absolute inset-0" />
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
            <Link href={featured.href}>
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

const Lv1MenuItem = ({ menuItem }: { menuItem: TNavigationItem }) => (
  <Link
    className="kiluan-nav-btn flex items-center self-center rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 lg:text-[15px] xl:px-5 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
    href={menuItem.href || '#'}
  >
    {menuItem.name}
    {menuItem.children?.length ? (
      <ChevronDownIcon className="ms-1 -me-1 size-4 text-neutral-400" aria-hidden="true" />
    ) : null}
  </Link>
)

function SubMenuLink({ item }: { item: TNavigationItem }) {
  const Icon = ikonNavigasi(item.icon)

  return (
    <li key={item.id} className={clsx('menu-item', item.isNew && 'menuIsNew')}>
      <Link
        href={item.href || '#'}
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

const MegaMenu = ({ menuItem }: { menuItem: TNavigationItem }) => {
  const kolom = menuItem.children?.length ?? 0
  const gridKolom =
    kolom >= 4 ? 'grid-cols-4' : kolom === 3 ? 'grid-cols-3' : kolom === 2 ? 'grid-cols-2' : 'grid-cols-1'

  return (
    <li className="menu-megamenu menu-item relative flex">
      <Lv1MenuItem menuItem={menuItem} />

      {menuItem.children?.length && menuItem.type === 'mega-menu' ? (
        <div className="absolute inset-x-0 top-full z-50 sub-menu">
          <div className="bg-white shadow-lg dark:bg-neutral-900">
            <div className="container">
              <div className="flex border-t border-neutral-200 py-11 text-sm dark:border-neutral-700">
                <div
                  className={clsx(
                    'grid min-w-0 flex-1 gap-6 pe-10 xl:gap-8 2xl:pe-14',
                    gridKolom,
                  )}
                >
                  {menuItem.children.map((menuChild) => (
                    <div key={menuChild.id} className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-neutral-200">{menuChild.name}</p>
                      <ul className="mt-4 grid space-y-1">{menuChild.children?.map((item) => (
                        <SubMenuLink key={item.id} item={item} />
                      ))}</ul>
                    </div>
                  ))}
                </div>
                {menuItem.featured ? (
                  <div className="grid w-2/7 shrink-0 grid-cols-1 xl:w-4/9">
                    <FeaturedCard featured={menuItem.featured} />
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

const KiluanNavigation: FC<Props> = ({ menu, className }) => (
  <ul className={clsx('kiluan-nav relative flex items-center', className)}>
    {menu.map((menuItem) => (
      <MegaMenu key={menuItem.id} menuItem={menuItem} />
    ))}
  </ul>
)

export default KiluanNavigation
