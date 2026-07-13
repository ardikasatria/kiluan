'use client'

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Drawer navigasi dasbor mobile — geser dari kiri (selaras pola aside situs). */
export default function DashboardNavDrawer({ open, onClose, title, children }: Props) {
  const t = useTranslations('dasbor.view')
  return (
    <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose} open={open}>
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-neutral-900/50 duration-300 ease-out data-closed:opacity-0"
      />

      <div className="fixed inset-0">
        <div className="absolute inset-0 overflow-hidden">
          <div className="fixed inset-y-0 left-0 flex max-w-full">
            <DialogPanel
              transition
              className={clsx(
                'h-screen w-[min(100vw-3rem,18rem)] overflow-hidden bg-white shadow-xl transition duration-200 ease-in-out dark:bg-neutral-900',
                'data-closed:-translate-x-full data-closed:opacity-0',
              )}
            >
              <div className="flex h-full flex-col">
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
                  <DialogTitle className="text-sm font-semibold text-primary-800 dark:text-primary-100">
                    {title}
                  </DialogTitle>
                  <button
                    type="button"
                    className="group -m-2 cursor-pointer rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    onClick={onClose}
                  >
                    <span className="sr-only">{t('tutupNav')}</span>
                    <HugeiconsIcon
                      className="transition-transform duration-200 group-hover:rotate-90"
                      icon={Cancel01Icon}
                      size={22}
                      strokeWidth={1}
                    />
                  </button>
                </header>
                <div className="flex-1 overflow-y-auto">{children}</div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
