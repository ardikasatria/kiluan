import { getNavigation } from '@/data/navigation'
import PwaInstallButton from '@/components/kiluan/PwaInstallButton'
import Logo from '@/shared/Logo'
import clsx from 'clsx'
import { FC } from 'react'
import AuthActions from './AuthActions'
import HamburgerBtnMenu from './HamburgerBtnMenu'
import HeaderLandingScroll from './HeaderLandingScroll'
import KiluanSearchModal from '@/components/kiluan/KiluanSearchModal'
import KiluanNavigation from './Navigation/KiluanNavigation'

interface Props {
  bottomBorder?: boolean
  className?: string
  variant?: 'default' | 'landing'
}

const KiluanHeader: FC<Props> = async ({ bottomBorder, className, variant = 'default' }) => {
  const navigationMenu = await getNavigation()
  const isLanding = variant === 'landing'

  return (
    <header
      data-landing={isLanding ? '' : undefined}
      className={clsx(
        'kiluan-header sticky top-0 z-30 transition-[background-color,border-color,box-shadow] duration-300',
        isLanding
          ? [
              'border-transparent bg-transparent shadow-none',
              'lg:[&.is-scrolled]:border-neutral-200/80 lg:[&.is-scrolled]:bg-white/85 lg:[&.is-scrolled]:shadow-sm lg:[&.is-scrolled]:backdrop-blur-xl',
              'lg:dark:[&.is-scrolled]:border-neutral-700/60 lg:dark:[&.is-scrolled]:bg-neutral-900/85',
              'max-lg:border-neutral-200 max-lg:bg-white/95 max-lg:shadow-sm max-lg:dark:border-neutral-700 max-lg:dark:bg-neutral-900/95',
            ]
          : [
              'border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900',
              'lg:border-b lg:border-white/40 lg:bg-white/70 lg:shadow-[0_4px_30px_rgba(0,0,0,0.04)] lg:backdrop-blur-xl lg:backdrop-saturate-150',
              'lg:dark:border-neutral-700/50 lg:dark:bg-neutral-900/65 lg:dark:shadow-[0_4px_30px_rgba(0,0,0,0.25)]',
            ],
        bottomBorder && !isLanding && 'border-b',
        !bottomBorder && 'has-[.header-popover-full-panel]:border-b',
        className,
      )}
    >
      {isLanding ? <HeaderLandingScroll /> : null}
      <div className="container flex h-[72px] items-center justify-between gap-x-4 lg:h-20">
        <div className="flex min-w-0 flex-1 items-center gap-x-3 sm:gap-x-4 lg:max-w-[280px]">
          <Logo />
          <div className="hidden h-7 border-l border-neutral-200 lg:border-neutral-300/60 lg:block dark:border-neutral-700 dark:lg:border-neutral-600/50" />
          <div className="hidden lg:block">
            <KiluanSearchModal type="type1" />
          </div>
        </div>

        <div className="hidden flex-1 justify-center lg:flex">
          <KiluanNavigation menu={navigationMenu} />
        </div>

        <div className="flex flex-1 items-center justify-end gap-x-1">
          <PwaInstallButton variant="header" />
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
