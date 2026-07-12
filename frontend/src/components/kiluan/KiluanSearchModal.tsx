'use client'

import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { FC, FormEvent, useEffect, useState } from 'react'

interface Props {
  type?: 'type1' | 'icon'
}

const KiluanSearchModal: FC<Props> = ({ type = 'type1' }) => {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const router = useRouter()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const term = q.trim()
    setOpen(false)
    if (term) router.push(`/jelajah?q=${encodeURIComponent(term)}`)
    else router.push('/jelajah')
    setQ('')
  }

  return (
    <>
      {type === 'type1' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="kiluan-search-trigger flex w-full max-w-[200px] items-center gap-2 rounded-full border border-neutral-200/80 bg-neutral-50/80 px-3.5 py-2 text-sm text-neutral-500 backdrop-blur-sm hover:border-primary-300 xl:max-w-[220px] dark:border-neutral-600/70 dark:bg-neutral-800/50 dark:text-neutral-400 lg:bg-white/45 lg:dark:bg-neutral-800/40"
        >
          <MagnifyingGlassIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Cari destinasi…</span>
          <kbd className="ms-auto hidden rounded border border-neutral-200 px-1.5 text-[10px] text-neutral-400 sm:inline dark:border-neutral-600">
            ⌘K
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label="Cari destinasi"
        >
          <MagnifyingGlassIcon className="size-5" aria-hidden />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Tutup pencarian"
            onClick={() => setOpen(false)}
          />
          <div
            className={clsx(
              'relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900',
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Cari destinasi"
          >
            <form onSubmit={submit} className="flex items-center gap-2">
              <MagnifyingGlassIcon className="size-5 shrink-0 text-neutral-400" aria-hidden />
              <input
                autoFocus
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari spot wisata, pantai, lumba-lumba…"
                className="flex-1 border-0 bg-transparent py-2 text-base text-neutral-900 placeholder:text-neutral-400 focus:ring-0 focus:outline-none dark:text-neutral-100"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Tutup"
              >
                <XMarkIcon className="size-5" aria-hidden />
              </button>
            </form>
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              Tekan Enter untuk membuka halaman Jelajah dengan kata kunci Anda.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default KiluanSearchModal
