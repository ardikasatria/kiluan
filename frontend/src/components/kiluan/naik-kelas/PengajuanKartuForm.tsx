'use client'

import {
  ajukanKartu,
  revisiPengajuan,
  transisiPengajuan,
} from '@/lib/api/naik-kelas'
import { kodeGalat, pesanGalat } from '@/lib/api/galat'
import { konfirmasiMedia, presignMedia, unggahKeMinio } from '@/lib/api/media'
import type { KartuAksiItem, PengajuanKartuItem } from '@/lib/api/types'
import { labelBuktiDibutuhkan, validasiBuktiLokal } from '@/lib/kiluan/naik-kelas'
import { CameraIcon, DocumentIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

interface Props {
  desaSlug: string
  kartu: KartuAksiItem
  subjekTipe: 'umkm' | 'agen' | 'kontributor'
  subjekId: string
  pengajuanRevisi?: PengajuanKartuItem | null
  onBerhasil?: () => void
  onBatal?: () => void
}

export default function PengajuanKartuForm({
  desaSlug,
  kartu,
  subjekTipe,
  subjekId,
  pengajuanRevisi,
  onBerhasil,
  onBatal,
}: Props) {
  const t = useTranslations('naikKelas')
  const locale = useLocale()
  const tLib = t as unknown as (key: string) => string
  const [pernyataan, setPernyataan] = useState(
    String(pengajuanRevisi?.bukti?.pernyataan ?? ''),
  )
  const [fotoMediaId, setFotoMediaId] = useState<string | null>(
    (pengajuanRevisi?.bukti?.foto_media_id as string) ?? null,
  )
  const [dokumenMediaId, setDokumenMediaId] = useState<string | null>(
    (pengajuanRevisi?.bukti?.dokumen_media_id as string) ?? null,
  )
  const [unggah, setUnggah] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const butuh = kartu.bukti_dibutuhkan ?? {}

  function bangunBukti(): Record<string, unknown> {
    const bukti: Record<string, unknown> = {}
    if (butuh.pernyataan) bukti.pernyataan = pernyataan.trim()
    if (butuh.foto && fotoMediaId) bukti.foto_media_id = fotoMediaId
    if (butuh.dokumen && dokumenMediaId) bukti.dokumen_media_id = dokumenMediaId
    return bukti
  }

  async function unggahBerkas(file: File, tipe: 'foto' | 'dokumen') {
    setUnggah(true)
    setError(null)
    try {
      const presign = await presignMedia(desaSlug, file)
      await unggahKeMinio(presign.url_unggah, file)
      const media = await konfirmasiMedia(desaSlug, {
        media_id: presign.media_id,
        tipe: 'foto',
        alt: file.name,
      })
      if (tipe === 'foto') setFotoMediaId(media.id)
      else setDokumenMediaId(media.id)
    } catch {
      setError(t('form.uploadError'))
    } finally {
      setUnggah(false)
    }
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const bukti = bangunBukti()
    const kodeLokal = validasiBuktiLokal(butuh, bukti)
    if (kodeLokal) {
      setError(t(`form.errors.${kodeLokal}` as 'form.errors.foto_wajib'))
      setLoading(false)
      return
    }
    try {
      if (pengajuanRevisi) {
        await revisiPengajuan(desaSlug, pengajuanRevisi.id, bukti)
        await transisiPengajuan(desaSlug, pengajuanRevisi.id, 'ajukan')
      } else {
        await ajukanKartu(desaSlug, {
          subjek_tipe: subjekTipe,
          subjek_id: subjekId,
          kartu_id: kartu.id,
          bukti,
        })
      }
      onBerhasil?.()
    } catch (err) {
      const kode = kodeGalat(err)
      if (kode === 'validasi_gagal') {
        setError(t('form.errors.buktiKurang'))
      } else {
        setError(pesanGalat(err, locale as 'id' | 'en') || t('form.submitError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const buktiLabel = labelBuktiDibutuhkan(butuh, tLib).join(' · ') || '—'

  return (
    <form
      onSubmit={(e) => void kirim(e)}
      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
    >
      <h3 className="font-semibold text-primary-800 dark:text-primary-100">
        {pengajuanRevisi ? t('form.revisiTitle') : t('form.ajukanTitle')}
      </h3>
      <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">{kartu.nama}</p>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{t('form.buktiLabel', { bukti: buktiLabel })}</p>

      {butuh.foto && (
        <div className="mt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
            <CameraIcon className="size-5" />
            {unggah ? t('form.mengunggah') : fotoMediaId ? t('form.fotoTerunggah') : t('form.unggah')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={unggah}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void unggahBerkas(f, 'foto')
              }}
            />
          </label>
        </div>
      )}

      {butuh.dokumen && (
        <div className="mt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
            <DocumentIcon className="size-5" />
            {unggah ? t('form.mengunggah') : dokumenMediaId ? t('form.dokumenTerunggah') : t('form.unggahDokumen')}
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              disabled={unggah}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void unggahBerkas(f, 'dokumen')
              }}
            />
          </label>
        </div>
      )}

      {butuh.pernyataan && (
        <textarea
          required
          value={pernyataan}
          onChange={(e) => setPernyataan(e.target.value)}
          placeholder={t('form.placeholder')}
          rows={3}
          className="mt-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        />
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading || unggah}
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50 dark:bg-primary-600"
        >
          {loading ? t('form.mengirim') : pengajuanRevisi ? t('form.kirimUlang') : t('form.ajukanKartu')}
        </button>
        {onBatal && (
          <button
            type="button"
            onClick={onBatal}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600 dark:text-neutral-200"
          >
            {t('form.batal')}
          </button>
        )}
      </div>
    </form>
  )
}
