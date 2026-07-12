'use client'

import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface Props {
  className?: string
  variant?: 'header' | 'footer'
}

export default function PwaInstallButton({ className, variant = 'header' }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const t = useTranslations('nav.pwa')

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !deferred) return null

  const install = async () => {
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
      setDeferred(null)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={clsx(
        'inline-flex items-center gap-2 rounded-full font-semibold transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none',
        variant === 'header'
          ? 'hidden border border-primary-300/80 bg-primary-50/90 px-4 py-2 text-sm text-primary-800 hover:bg-kiluan-mint/30 lg:inline-flex dark:border-primary-600/60 dark:bg-primary-900/40 dark:text-primary-100 dark:hover:bg-primary-800/60'
          : 'border border-primary-300 px-5 py-2.5 text-sm text-primary-800 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-100 dark:hover:bg-primary-900/40',
        className,
      )}
    >
      <ArrowDownTrayIcon className="size-4" aria-hidden />
      {t('install')}
    </button>
  )
}
