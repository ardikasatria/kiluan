'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export const DEFAULT_DESA_SLUG = 'teluk-kiluan'

const RUTE_GLOBAL = new Set([
  'masuk',
  'daftar',
  'admin',
  'cari',
  'paspor',
  'api',
  'forgot-password',
  'reset-password',
])

const DesaKonteks = createContext<string>(DEFAULT_DESA_SLUG)

export function ekstrakDesaSlug(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0]
  if (!seg || RUTE_GLOBAL.has(seg)) return DEFAULT_DESA_SLUG
  return seg
}

export function DesaKonteksProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const desaSlug = useMemo(() => ekstrakDesaSlug(pathname), [pathname])
  return <DesaKonteks.Provider value={desaSlug}>{children}</DesaKonteks.Provider>
}

export function useDesaSlug(): string {
  return useContext(DesaKonteks)
}
