'use client'

import type { Locale } from '@/i18n/routing'
import { pesanGalatLokal } from '@/lib/i18n/galat-lokal'
import { useLocale } from 'next-intl'
import { useCallback } from 'react'

export function usePesanGalat() {
  const locale = useLocale() as Locale
  return useCallback((err: unknown) => pesanGalatLokal(err, locale), [locale])
}
