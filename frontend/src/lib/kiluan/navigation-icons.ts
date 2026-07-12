import {
  ArrowPathIcon,
  BanknotesIcon,
  BeakerIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClockIcon,
  CubeIcon,
  EyeIcon,
  GlobeAltIcon,
  GlobeAmericasIcon,
  HomeModernIcon,
  MapIcon,
  MapPinIcon,
  NewspaperIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
  TicketIcon,
  TruckIcon,
  UserGroupIcon,
  UserIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'

export type NavIconKey =
  | 'sun'
  | 'eye'
  | 'sparkles'
  | 'globe'
  | 'library'
  | 'shop'
  | 'map'
  | 'star'
  | 'pin'
  | 'calendar'
  | 'clock'
  | 'book'
  | 'ticket'
  | 'users'
  | 'badge'
  | 'home'
  | 'truck'
  | 'tool'
  | 'beaker'
  | 'news'
  | 'money'
  | 'cycle'
  | 'user'
  | 'cube'

const NAV_ICONS: Record<NavIconKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  sun: SunIcon,
  eye: EyeIcon,
  sparkles: SparklesIcon,
  globe: GlobeAmericasIcon,
  library: BuildingLibraryIcon,
  shop: ShoppingBagIcon,
  map: MapIcon,
  star: StarIcon,
  pin: MapPinIcon,
  calendar: CalendarDaysIcon,
  clock: ClockIcon,
  book: BookOpenIcon,
  ticket: TicketIcon,
  users: UserGroupIcon,
  badge: CheckBadgeIcon,
  home: HomeModernIcon,
  truck: TruckIcon,
  tool: WrenchScrewdriverIcon,
  beaker: BeakerIcon,
  news: NewspaperIcon,
  money: BanknotesIcon,
  cycle: ArrowPathIcon,
  user: UserIcon,
  cube: CubeIcon,
}

export function ikonNavigasi(key?: string): ComponentType<SVGProps<SVGSVGElement>> | null {
  if (!key) return null
  return NAV_ICONS[key as NavIconKey] ?? GlobeAltIcon
}
