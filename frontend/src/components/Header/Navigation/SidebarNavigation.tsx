'use client'

import { TNavigationItem } from '@/data/navigation'
import { useRouter } from '@/i18n/navigation'
import { ikonNavigasi } from '@/lib/kiluan/navigation-icons'
import type { Locale } from '@/i18n/routing'
import { withLocale } from '@/lib/i18n/locale-path'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import SocialsList from '@/shared/SocialsList'
import SwitchDarkMode from '@/shared/SwitchDarkMode'
import { Disclosure, DisclosureButton, DisclosurePanel, useClose } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import React from 'react'

interface Props {
  data: TNavigationItem[]
}

const SidebarNavigation: React.FC<Props> = ({ data }) => {
  const handleClose = useClose()
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('nav.sidebar')

  const _renderMenuChild = (
    item: TNavigationItem,
    itemClass = 'ps-3 text-neutral-900 dark:text-neutral-200 font-medium',
    depth = 0,
  ) => {
    return (
      <ul className={clsx('nav-mobile-sub-menu pb-1 text-base', depth === 0 ? 'ps-6' : 'ps-4')}>
        {item.children?.map((childMenu, index) => {
          const Icon = ikonNavigasi(childMenu.icon)
          return (
          <Disclosure key={index} as="li">
            <Link
              href={childMenu.href || '#'}
              onClick={handleClose}
              className={`mt-0.5 flex items-center gap-2.5 rounded-lg pe-4 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${itemClass}`}
            >
              {Icon && depth > 0 ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-primary-600 dark:bg-neutral-800 dark:text-primary-400">
                  <Icon className="size-4" aria-hidden />
                </span>
              ) : null}
              <span className={`flex-1 py-2.5 ${!childMenu.children ? 'block w-full' : ''}`}>
                {childMenu.name}
                {childMenu.description && depth > 0 ? (
                  <span className="mt-0.5 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
                    {childMenu.description}
                  </span>
                ) : null}
              </span>
              {childMenu.children && (
                <span className="flex shrink-0 items-center" onClick={(e) => e.preventDefault()}>
                  <DisclosureButton as="span" className="flex justify-end">
                    <ChevronDownIcon className="ms-2 h-4 w-4 text-neutral-500" aria-hidden="true" />
                  </DisclosureButton>
                </span>
              )}
            </Link>
            {childMenu.children && (
              <DisclosurePanel>
                {_renderMenuChild(childMenu, 'ps-3 text-neutral-600 dark:text-neutral-400', depth + 1)}
              </DisclosurePanel>
            )}
          </Disclosure>
        )})}
      </ul>
    )
  }

  const _renderItem = (menu: TNavigationItem, index: number) => {
    return (
      <Disclosure key={index} as="li" className="text-neutral-900 dark:text-white">
        <DisclosureButton className="flex w-full cursor-pointer rounded-lg px-3 text-start text-sm font-bold tracking-wide uppercase hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <Link
            href={menu.href || '#'}
            className={clsx(!menu.children?.length && 'flex-1', 'block py-2.5')}
            onClick={handleClose}
          >
            {menu.name}
          </Link>
          {menu.children?.length && (
            <div className="flex flex-1 justify-end">
              <ChevronDownIcon className="ms-2 h-4 w-4 self-center text-neutral-500" aria-hidden="true" />
            </div>
          )}
        </DisclosureButton>
        {menu.children && <DisclosurePanel>{_renderMenuChild(menu)}</DisclosurePanel>}
      </Disclosure>
    )
  }

  const renderSearchForm = () => {
    return (
      <form
        action="#"
        method="POST"
        className="flex-1 text-neutral-900 dark:text-neutral-200"
        onSubmit={(e) => {
          e.preventDefault()
          handleClose()
          router.push('/jelajah')
        }}
      >
        <div className="flex h-full items-center gap-x-2.5 rounded-xl bg-neutral-50 px-3 py-3 dark:bg-neutral-800">
          <HugeiconsIcon icon={Search01Icon} size={24} color="currentColor" strokeWidth={1.5} />
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            className="w-full border-none bg-transparent focus:ring-0 focus:outline-hidden sm:text-sm"
          />
        </div>
        <input type="submit" hidden value="" />
      </form>
    )
  }

  return (
    <div>
      <p className="text-sm/relaxed">{t('tagline')}</p>
      <div className="mt-5 flex items-center justify-between">
        <SocialsList />
      </div>
      <div className="mt-5">{renderSearchForm()}</div>
      <ul className="flex flex-col gap-y-1 px-2 py-6">{data?.map(_renderItem)}</ul>
      <Divider className="mb-6" />

      {/* FOR OUR DEMO */}
      <div className="flex items-center justify-between gap-x-2.5 py-6">
        <div className="flex gap-2">
          <ButtonPrimary href={withLocale('/masuk', locale)}>{t('masuk')}</ButtonPrimary>
          <ButtonPrimary href={withLocale('/daftar', locale)} className="bg-primary-700!">
            {t('daftar')}
          </ButtonPrimary>
        </div>

        <SwitchDarkMode />
      </div>
    </div>
  )
}

export default SidebarNavigation
