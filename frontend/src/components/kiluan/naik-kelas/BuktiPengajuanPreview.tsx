'use client'

import { useTranslations } from 'next-intl'

interface Props {
  bukti: Record<string, unknown>
}

export default function BuktiPengajuanPreview({ bukti }: Props) {
  const t = useTranslations('naikKelas.buktiPreview')

  const pernyataan = typeof bukti.pernyataan === 'string' ? bukti.pernyataan : null
  const fotoId = typeof bukti.foto_media_id === 'string' ? bukti.foto_media_id : null
  const dokId = typeof bukti.dokumen_media_id === 'string' ? bukti.dokumen_media_id : null

  if (!pernyataan && !fotoId && !dokId) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
      <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('title')}</h4>
      {pernyataan && (
        <blockquote className="border-l-4 border-primary-400 pl-3 text-sm text-neutral-700 dark:text-neutral-300">
          {pernyataan}
        </blockquote>
      )}
      {fotoId && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('foto', { id: fotoId.slice(0, 8) })}
        </p>
      )}
      {dokId && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('dokumen', { id: dokId.slice(0, 8) })}
        </p>
      )}
    </div>
  )
}
