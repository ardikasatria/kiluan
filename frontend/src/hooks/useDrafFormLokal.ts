'use client'

import {
  bacaDrafLokal,
  hapusDrafLokal,
  type EntriDrafLokal,
  simpanDrafLokal,
} from '@/lib/kiluan/draf-lokal'
import { useCallback, useEffect, useRef, useState } from 'react'

export type StatusDrafLokal = 'idle' | 'menyimpan' | 'tersimpan'

interface Options<T> {
  kunci: string
  data: T
  /** Nonaktifkan autosave (mis. saat belum siap) */
  aktif?: boolean
  debounceMs?: number
}

interface Hasil<T> {
  menungguPulihkan: EntriDrafLokal<T> | null
  status: StatusDrafLokal
  diperbaruiPada: number | null
  pulihkan: () => T | null
  buangDraf: () => void
  hapusDraf: () => void
}

export function useDrafFormLokal<T>({
  kunci,
  data,
  aktif = true,
  debounceMs = 800,
}: Options<T>): Hasil<T> {
  const [menungguPulihkan, setMenungguPulihkan] = useState<EntriDrafLokal<T> | null>(null)
  const [status, setStatus] = useState<StatusDrafLokal>('idle')
  const [diperbaruiPada, setDiperbaruiPada] = useState<number | null>(null)
  const baseline = useRef<string | null>(null)
  const dimuat = useRef(false)

  useEffect(() => {
    dimuat.current = false
    baseline.current = null
    setMenungguPulihkan(null)
    setStatus('idle')
    setDiperbaruiPada(null)

    const draf = bacaDrafLokal<T>(kunci)
    if (draf) setMenungguPulihkan(draf)
    dimuat.current = true
  }, [kunci])

  useEffect(() => {
    if (!aktif || !dimuat.current || menungguPulihkan) return

    const serial = JSON.stringify(data)
    if (baseline.current === null) {
      baseline.current = serial
      return
    }
    if (serial === baseline.current) return

    setStatus('menyimpan')
    const timer = window.setTimeout(() => {
      simpanDrafLokal(kunci, data)
      setDiperbaruiPada(Date.now())
      setStatus('tersimpan')
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [data, kunci, aktif, menungguPulihkan, debounceMs])

  const pulihkan = useCallback(() => {
    if (!menungguPulihkan) return null
    const { data: draf } = menungguPulihkan
    setMenungguPulihkan(null)
    baseline.current = null
    setDiperbaruiPada(menungguPulihkan.diperbaruiPada)
    setStatus('tersimpan')
    return draf
  }, [menungguPulihkan])

  const buangDraf = useCallback(() => {
    hapusDrafLokal(kunci)
    setMenungguPulihkan(null)
    baseline.current = JSON.stringify(data)
    setDiperbaruiPada(null)
    setStatus('idle')
  }, [kunci, data])

  const hapusDraf = useCallback(() => {
    hapusDrafLokal(kunci)
    setMenungguPulihkan(null)
    baseline.current = JSON.stringify(data)
    setDiperbaruiPada(null)
    setStatus('idle')
  }, [kunci, data])

  return { menungguPulihkan, status, diperbaruiPada, pulihkan, buangDraf, hapusDraf }
}
