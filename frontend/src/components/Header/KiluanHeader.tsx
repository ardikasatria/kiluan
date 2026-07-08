import { getNavigation } from '@/data/navigation'
import Logo from '@/shared/Logo'
import clsx from 'clsx'
import { FC } from 'react'
import AuthActions from './AuthActions'
import HamburgerBtnMenu from './HamburgerBtnMenu'
import KiluanNavigation from './Navigation/KiluanNavigation'
import SearchModal from './SearchModal'

interface Props {
  bottomBorder?: boolean
  className?: string
}

const KiluanHeader: FC<Props> = async ({ bottomBorder, className }) => {
  const navigationMenu = await getNavigation()

  return (
    <header
      className={clsx(
        'kiluan-header relative z-20 border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
        bottomBorder && 'border-b',
        !bottomBorder && 'has-[.header-popover-full-panel]:border-b',
        className
      )}
    >
      <div className="container flex h-[72px] items-center justify-between gap-x-4 lg:h-20">
        {/* Kiri: Logo + Search */}
        <div className="flex min-w-0 flex-1 items-center gap-x-3 sm:gap-x-4 lg:max-w-[280px]">
          <Logo />
          <div className="hidden h-7 border-l border-neutral-200 sm:block dark:border-neutral-700" />
          <SearchModal type="type1" />
        </div>

        {/* Tengah: 3 mega menu */}
        <div className="hidden flex-1 justify-center lg:flex">
          <KiluanNavigation menu={navigationMenu} />
        </div>

        {/* Kanan: Theme toggle + Auth / User */}
        <div className="flex flex-1 items-center justify-end gap-x-1">
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
