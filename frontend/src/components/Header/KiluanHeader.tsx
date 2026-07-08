import { getNavigation } from '@/data/navigation'
import Logo from '@/shared/Logo'
import clsx from 'clsx'
import { FC } from 'react'
import AuthActions from './AuthActions'
import HamburgerBtnMenu from './HamburgerBtnMenu'
import KiluanSearchModal from '@/components/kiluan/KiluanSearchModal'
import KiluanNavigation from './Navigation/KiluanNavigation'

interface Props {
  bottomBorder?: boolean
  className?: string
}

const KiluanHeader: FC<Props> = async ({ bottomBorder, className }) => {
  const navigationMenu = await getNavigation()

  return (
    <header
      className={clsx(
        'kiluan-header sticky top-0 z-30',
        // Mobile — solid (keterbacaan & performa)
        'border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900',
        // Desktop — glass / blur
        'lg:border-b lg:border-white/40 lg:bg-white/70 lg:shadow-[0_4px_30px_rgba(0,0,0,0.04)] lg:backdrop-blur-xl lg:backdrop-saturate-150',
        'lg:dark:border-neutral-700/50 lg:dark:bg-neutral-900/65 lg:dark:shadow-[0_4px_30px_rgba(0,0,0,0.25)]',
        bottomBorder && 'border-b',
        !bottomBorder && 'has-[.header-popover-full-panel]:border-b',
        className,
      )}
    >
      <div className="container flex h-[72px] items-center justify-between gap-x-4 lg:h-20">
        {/* Kiri: Logo + Search (pencarian hanya desktop) */}
        <div className="flex min-w-0 flex-1 items-center gap-x-3 sm:gap-x-4 lg:max-w-[280px]">
          <Logo />
          <div className="hidden h-7 border-l border-neutral-200 lg:border-neutral-300/60 lg:block dark:border-neutral-700 dark:lg:border-neutral-600/50" />
          <div className="hidden lg:block">
            <KiluanSearchModal type="type1" />
          </div>
        </div>

        {/* Tengah: 3 mega menu */}
        <div className="hidden flex-1 justify-center lg:flex">
          <KiluanNavigation menu={navigationMenu} />
        </div>

        {/* Kanan: Theme toggle + Auth / User */}
        <div className="flex flex-1 items-center justify-end gap-x-1">
          <div className="flex lg:hidden">
            <KiluanSearchModal type="icon" />
          </div>
          <AuthActions />
          <div className="ms-1 flex lg:hidden">
            <HamburgerBtnMenu />
          </div>
        </div>
      </div>
    </header>
  )
}

export default KiluanHeader
