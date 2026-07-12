'use client'

import { unggahDanTempel, type UnggahOpsi } from '@/lib/api/media'
import type { LampiranPayload, MediaItem } from '@/lib/api/types'
import { tambahAntrean } from '@/lib/offline/db'
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  PhotoIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useCallback, useRef, useState } from 'react'

interface Props {
  desaSlug: string
  entitasTipe: LampiranPayload['entitas_tipe']
  entitasId: string
  urutanAwal?: number
  onBerhasil: (media: MediaItem) => void
  className?: string
}

type Tahap = 'idle' | 'unggah' | 'selesai' | 'gagal'

export default function MediaUploader({
  desaSlug,
  entitasTipe,
  entitasId,
  urutanAwal = 0,
  onBerhasil,
  className,
}: Props) {
  const t = useTranslations('media')
  const inputRef = useRef<HTMLInputElement>(null)
  const [tahap, setTahap] = useState<Tahap>('idle')
  const [progress, setProgress] = useState(0)
  const [pesan, setPesan] = useState<string | null>(null)
  const [dragover, setDragover] = useState(false)
  const [fileAktif, setFileAktif] = useState<File | null>(null)

  const prosesFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setPesan(t('unsupportedType'))
        setTahap('gagal')
        return
      }
      if (file.size > 25 * 1024 * 1024) {
        setPesan(t('maxSize'))
        setTahap('gagal')
        return
      }
      if (!navigator.onLine) {
        setPesan(t('offline'))
        setTahap('gagal')
        return
      }

      setFileAktif(file)
      setTahap('unggah')
      setProgress(0)
      setPesan(null)

      const opsi: UnggahOpsi = {
        desaSlug,
        file,
        entitasTipe,
        entitasId,
        urutan: urutanAwal,
        utama: urutanAwal === 0,
        onProgress: setProgress,
      }

      try {
        const media = await unggahDanTempel(opsi)
        setTahap('selesai')
        onBerhasil(media)
        setTimeout(() => {
          setTahap('idle')
          setFileAktif(null)
          setProgress(0)
        }, 1500)
      } catch (err) {
        setTahap('gagal')
        const msg = err instanceof Error ? err.message : t('uploadFailed')
        setPesan(msg)
        try {
          await tambahAntrean({
            desaSlug,
            method: 'POST',
            path: `/api/v1/desa/${desaSlug}/media/konfirmasi`,
            body: JSON.stringify({
              pesan: 'unggah_put_mungkin_berhasil',
              file: file.name,
            }),
          })
        } catch {
          /* antrean opsional */
        }
      }
    },
    [desaSlug, entitasId, entitasTipe, onBerhasil, t, urutanAwal],
  )

  const onPilih = (files: FileList | null) => {
    const f = files?.[0]
    if (f) void prosesFile(f)
  }

  return (
    <div className={clsx('space-y-3', className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onClick={() => tahap !== 'unggah' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragover(true)
        }}
        onDragLeave={() => setDragover(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragover(false)
          onPilih(e.dataTransfer.files)
        }}
        className={clsx(
          'relative rounded-2xl border-2 border-dashed p-5 text-center transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none sm:p-8',
          dragover
            ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/30'
            : 'border-neutral-300 bg-neutral-50 hover:border-primary-400 hover:bg-primary-50/50 dark:border-neutral-600 dark:bg-neutral-800/50 dark:hover:border-primary-500 dark:hover:bg-primary-900/20',
          tahap === 'unggah' && 'pointer-events-none opacity-90',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(e) => onPilih(e.target.files)}
        />

        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
          {tahap === 'unggah' ? (
            <ArrowPathIcon className="size-6 animate-spin" aria-hidden />
          ) : (
            <CloudArrowUpIcon className="size-6" aria-hidden />
          )}
        </div>

        <p className="mt-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {tahap === 'unggah' ? t('uploading') : t('dropHint')}
        </p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('flowHint')}</p>

        {tahap === 'unggah' && (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full rounded-full bg-primary-600 transition-all duration-300 dark:bg-primary-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-medium text-primary-700 dark:text-primary-300">{progress}%</p>
            {fileAktif && (
              <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{fileAktif.name}</p>
            )}
          </div>
        )}

        {tahap === 'selesai' && (
          <p className="mt-2 text-sm font-medium text-primary-700 dark:text-primary-300">{t('success')}</p>
        )}
      </div>

      {pesan && (
        <p
          className={clsx(
            'flex items-start gap-2 rounded-xl px-4 py-3 text-sm',
            tahap === 'gagal'
              ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
              : 'bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200',
          )}
        >
          {pesan.includes('online') || pesan.includes('koneksi') || pesan.includes('Connection') ? (
            <SignalSlashIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <PhotoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          {pesan}
          {tahap === 'gagal' && (
            <button
              type="button"
              className="ms-auto shrink-0 font-semibold underline"
              onClick={() => fileAktif && void prosesFile(fileAktif)}
            >
              {t('retry')}
            </button>
          )}
        </p>
      )}
    </div>
  )
}
