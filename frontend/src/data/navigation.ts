import { getLocale, getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import {
  FOOTER_LINK_DEFS,
  localizeHref,
  NAV_MENUS,
  type NavItemDef,
  type NavMenuDef,
} from './navigation-config'

export type TNavigationFeatured = {
  title: string
  description: string
  href: string
  badge?: string
  image?: string
}

export type TNavigationItem = Partial<{
  id: string
  href: string
  name: string
  description?: string
  icon?: string
  type?: 'dropdown' | 'mega-menu'
  isNew?: boolean
  soon?: boolean
  children?: TNavigationItem[]
  featured?: TNavigationFeatured
}>

function resolveItem(
  def: NavItemDef,
  locale: Locale,
  t: (key: string) => string,
): TNavigationItem {
  return {
    id: def.id,
    href: localizeHref(def.href, locale),
    name: t(def.nameKey),
    description: def.descriptionKey ? t(def.descriptionKey) : undefined,
    icon: def.icon,
    soon: def.soon,
    children: def.children?.map((child) => resolveItem(child, locale, t)),
  }
}

function resolveMenu(def: NavMenuDef, locale: Locale, t: (key: string) => string): TNavigationItem {
  return {
    id: def.id,
    href: localizeHref(def.href, locale),
    name: t(def.nameKey),
    type: def.type,
    featured: {
      title: t(def.featured.titleKey),
      description: t(def.featured.descriptionKey),
      href: localizeHref(def.featured.href, locale),
      badge: def.featured.badgeKey ? t(def.featured.badgeKey) : undefined,
      image: def.featured.image,
    },
    children: def.children.map((child) => resolveItem(child, locale, t)),
  }
}

export async function getNavigation(): Promise<TNavigationItem[]> {
  const t = (await getTranslations('nav')) as unknown as (key: string) => string
  const locale = (await getLocale()) as Locale
  return NAV_MENUS.map((menu) => resolveMenu(menu, locale, t))
}

export async function getNavMegaMenu(): Promise<TNavigationItem> {
  const navigation = await getNavigation()
  return navigation[0] || {}
}

/** Tautan footer — sinkron dengan menu utama. */
export async function getFooterLinks(): Promise<{ href: string; label: string }[]> {
  const t = (await getTranslations('nav')) as unknown as (key: string) => string
  const locale = (await getLocale()) as Locale
  return FOOTER_LINK_DEFS.map((link) => ({
    href: localizeHref(link.href, locale),
    label: t(link.labelKey),
  }))
}

export const getLanguages = async () => {
  return [
    {
      id: 'Indonesia',
      name: 'Bahasa Indonesia',
      description: 'Indonesia',
      href: '#',
      active: true,
    },
    {
      id: 'English',
      name: 'English',
      description: 'United States',
      href: '#',
    },
  ]
}

export const getCurrencies = async () => {
  return [
    {
      id: 'IDR',
      name: 'IDR',
      href: '#',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="currentColor" fill="none">
    <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="1.5"></path>
    <path d="M9 12H13.2M9 12V9.2963C9 8.82489 9 8.58919 9.14645 8.44274C9.29289 8.2963 9.5286 8.2963 10 8.2963H13.2C14.1941 8.2963 15 9.1254 15 10.1481C15 11.1709 14.1941 12 13.2 12M9 12V14.7037C9 15.1751 9 15.4108 9.14645 15.5572C9.29289 15.7037 9.5286 15.7037 10 15.7037H13.2C14.1941 15.7037 15 14.8746 15 13.8518C15 12.8291 14.1941 12 13.2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
</svg>`,
      active: true,
    },
  ]
}

export const getHeaderDropdownCategories = async () => {
  return []
}
