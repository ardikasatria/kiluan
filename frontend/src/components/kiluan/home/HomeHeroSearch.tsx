'use client'

import { useRouter } from '@/i18n/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { FormEvent, useState } from 'react'

export default function HomeHeroSearch() {
  const [q, setQ] = useState('')
  const router = useRouter()
  const t = useTranslations('landing.hero')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const term = q.trim()
    if (term) router.push(`/jelajah?q=${encodeURIComponent(term)}`)
    else router.push('/jelajah')
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-xl">
      <label className="sr-only" htmlFor="hero-search">
        {t('searchLabel')}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="relative flex-1">
          <MagnifyingGlassIcon
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-primary-200"
            aria-hidden
          />
          <input
            id="hero-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-full border border-white/25 bg-white/12 py-3.5 pr-4 pl-12 text-sm text-white placeholder:text-primary-100/70 backdrop-blur-md focus:border-kiluan-mint/50 focus:ring-2 focus:ring-kiluan-mint/30 focus:outline-none"
          />
        </span>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-kiluan-sea px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-500 focus-visible:ring-2 focus-visible:ring-kiluan-mint focus-visible:outline-none"
        >
          {t('searchButton')}
        </button>
      </div>
    </form>
  )
}
