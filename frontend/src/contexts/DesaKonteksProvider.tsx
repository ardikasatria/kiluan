'use client'

import { daftarDesaDiscovery } from '@/lib/api/discovery'
import { locales } from '@/i18n/routing'
import { stripLocale } from '@/lib/i18n/locale-path'
import { isSegmenRuteGlobal } from '@/lib/kiluan/rute-global'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export const DEFAULT_DESA_SLUG = 'teluk-kiluan'

const DesaKonteks = createContext<string>(DEFAULT_DESA_SLUG)

/** Slug desa dari pathname; fallback ke default bila segmen global atau bukan desa terdaftar. */
export function ekstrakDesaSlug(pathname: string, slugDesaTerdaftar?: ReadonlySet<string>): string {
  const path = stripLocale(pathname, locales)
  const seg = path.split('/').filter(Boolean)[0]
  if (isSegmenRuteGlobal(seg)) return DEFAULT_DESA_SLUG
  if (slugDesaTerdaftar && slugDesaTerdaftar.size > 0 && !slugDesaTerdaftar.has(seg)) {
    return DEFAULT_DESA_SLUG
  }
  return seg
}

export function DesaKonteksProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [slugDesa, setSlugDesa] = useState<Set<string> | null>(null)

  useEffect(() => {
    let batal = false
    void daftarDesaDiscovery({ batas: 100 })
      .then((res) => {
        if (batal) return
        setSlugDesa(new Set(res.item.map((d) => d.slug)))
      })
      .catch(() => {
        if (!batal) setSlugDesa(new Set([DEFAULT_DESA_SLUG]))
      })
    return () => {
      batal = true
    }
  }, [])

  const desaSlug = useMemo(
    () => ekstrakDesaSlug(pathname, slugDesa ?? undefined),
    [pathname, slugDesa],
  )

  return <DesaKonteks.Provider value={desaSlug}>{children}</DesaKonteks.Provider>
}

export function useDesaSlug(): string {
  return useContext(DesaKonteks)
}
