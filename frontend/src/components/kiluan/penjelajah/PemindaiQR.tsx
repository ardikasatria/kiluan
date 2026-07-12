'use client'

import { QrCodeIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Html5Qrcode } from 'html5-qrcode'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (token: string) => void
  className?: string
}

export default function PemindaiQR({ value, onChange, className }: Props) {
  const t = useTranslations('misi.qr')
  const regionId = useId().replace(/:/g, '')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [kameraGalat, setKameraGalat] = useState<string | null>(null)
  const [memindai, setMemindai] = useState(false)

  const hentikan = useCallback(async () => {
    const s = scannerRef.current
    if (!s) return
    try {
      if (s.isScanning) await s.stop()
    } catch {
      /* scanner sudah berhenti */
    }
    scannerRef.current = null
    setMemindai(false)
  }, [])

  useEffect(() => {
    if (mode !== 'scan') {
      void hentikan()
      return
    }

    let cancelled = false
    const scanner = new Html5Qrcode(regionId)
    scannerRef.current = scanner
    setKameraGalat(null)
    setMemindai(true)

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          onChange(decoded.trim())
          void hentikan()
        },
        () => {},
      )
      .catch(() => {
        if (!cancelled) {
          setKameraGalat(t('cameraDenied'))
          setMode('manual')
        }
      })

    return () => {
      cancelled = true
      void hentikan()
    }
  }, [mode, regionId, onChange, hentikan, t])

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('scan')}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-sm font-medium',
            mode === 'scan'
              ? 'bg-primary-600 text-white'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
          )}
        >
          {t('tabScan')}
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-sm font-medium',
            mode === 'manual'
              ? 'bg-primary-600 text-white'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
          )}
        >
          {t('tabManual')}
        </button>
      </div>

      {mode === 'scan' ? (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 dark:border-neutral-700">
          <div id={regionId} className="min-h-[240px] w-full [&_video]:rounded-xl" />
          {memindai && !kameraGalat && (
            <p className="px-3 py-2 text-center text-xs text-neutral-300">{t('scanHint')}</p>
          )}
          {kameraGalat && (
            <p className="px-3 py-2 text-center text-xs text-amber-300">{kameraGalat}</p>
          )}
        </div>
      ) : (
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          <QrCodeIcon className="mr-1 inline size-4" />
          {t('manualLabel')}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('manualPlaceholder')}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          />
          <span className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
            {t('manualHint')}
          </span>
        </label>
      )}

      {value && (
        <p className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-900 dark:bg-primary-900/30 dark:text-primary-100">
          {t('tokenDetected', { token: value.slice(0, 24) + (value.length > 24 ? '…' : '') })}
        </p>
      )}
    </div>
  )
}
