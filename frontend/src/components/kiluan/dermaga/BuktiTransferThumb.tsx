'use client'

import { getMediaDetail } from '@/lib/api/media'
import { pesanGalat } from '@/lib/api/galat'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  mediaId: string
}

export default function BuktiTransferThumb({ desaSlug, mediaId }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.bendahara.konfirmasi')
  const [url, setUrl] = useState<string | null>(null)
  const [galat, setGalat] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getMediaDetail(desaSlug, mediaId)
      .then((m) => {
        if (!cancelled && m.url) setUrl(m.url)
      })
      .catch((err) => {
        if (!cancelled) {
          setGalat(true)
          console.warn(pesanGalat(err, locale as 'id' | 'en'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [desaSlug, mediaId, locale])

  if (galat) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
        <PhotoIcon className="size-4" aria-hidden />
        {t('buktiGalat')}
      </span>
    )
  }

  if (!url) {
    return <span className="text-xs text-neutral-400">{t('muatBukti')}</span>
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-block overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={t('buktiAlt')}
        className="size-16 object-cover transition group-hover:opacity-90 sm:size-20"
      />
      <span className="sr-only">{t('lihatBukti')}</span>
    </a>
  )
}
