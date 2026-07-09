'use client'

import {
  kirimKontribusi,
  revisiKontribusi,
  transisiKontribusi,
} from '@/lib/api/kontribusi'
import { konfirmasiMedia, presignMedia, unggahKeMinio } from '@/lib/api/media'
import type { KontribusiItem, KontribusiTarget, TipeKontribusi } from '@/lib/api/types'
import { tambahAntrean } from '@/lib/offline/db'
import { CameraIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useState } from 'react'

const TIPE: { id: TipeKontribusi; label: string }[] = [
  { id: 'foto', label: 'Foto' },
  { id: 'tips', label: 'Tips' },
  { id: 'ulasan', label: 'Ulasan' },
  { id: 'koreksi_data', label: 'Koreksi' },
  { id: 'spot_baru', label: 'Spot baru' },
]

interface Props {
  desaSlug: string
  target?: KontribusiTarget
  kontribusiRevisi?: KontribusiItem | null
  onBerhasil?: () => void
  className?: string
}

export default function KontribusiForm({
  desaSlug,
  target,
  kontribusiRevisi,
  onBerhasil,
  className,
}: Props) {
  const [tipe, setTipe] = useState<TipeKontribusi>(kontribusiRevisi?.tipe ?? 'tips')
  const [isi, setIsi] = useState(String(kontribusiRevisi?.muatan?.isi ?? ''))
  const [field, setField] = useState(String(kontribusiRevisi?.muatan?.field ?? 'jam_operasional'))
  const [usulan, setUsulan] = useState(String(kontribusiRevisi?.muatan?.usulan ?? ''))
  const [alasan, setAlasan] = useState(String(kontribusiRevisi?.muatan?.alasan ?? ''))
  const [namaSpot, setNamaSpot] = useState(String(kontribusiRevisi?.muatan?.nama ?? ''))
  const [deskripsiSpot, setDeskripsiSpot] = useState(String(kontribusiRevisi?.muatan?.deskripsi ?? ''))
  const [mediaId, setMediaId] = useState<string | null>(kontribusiRevisi?.media_id ?? null)
  const [unggah, setUnggah] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const targetTipe = target?.target_tipe ?? kontribusiRevisi?.target_tipe ?? 'desa'
  const targetId = target?.target_id ?? kontribusiRevisi?.target_id ?? undefined

  function bangunMuatan(): Record<string, unknown> {
    if (tipe === 'tips' || tipe === 'ulasan') return { isi }
    if (tipe === 'koreksi_data') return { field, usulan, alasan }
    if (tipe === 'spot_baru') return { nama: namaSpot, deskripsi: deskripsiSpot }
    return { keterangan: isi }
  }

  async function unggahFoto(file: File) {
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
      setMediaId(media.id)
    } catch {
      setError('Gagal mengunggah foto.')
    } finally {
      setUnggah(false)
    }
  }

  async function kirim() {
    setLoading(true)
    setError(null)
    const body: Record<string, unknown> = {
      tipe,
      target_tipe: tipe === 'spot_baru' ? 'desa' : targetTipe,
      target_id: tipe === 'spot_baru' ? null : targetId,
      muatan: bangunMuatan(),
      media_id: tipe === 'foto' ? mediaId : null,
    }
    try {
      if (!navigator.onLine && !kontribusiRevisi) {
        await tambahAntrean({
          desaSlug,
          method: 'POST',
          path: `/api/v1/desa/${desaSlug}/kontribusi`,
          body: JSON.stringify(body),
        })
        onBerhasil?.()
        return
      }
      if (kontribusiRevisi) {
        await revisiKontribusi(desaSlug, kontribusiRevisi.id, bangunMuatan(), mediaId ?? undefined)
        await transisiKontribusi(desaSlug, kontribusiRevisi.id, 'ajukan')
      } else {
        await kirimKontribusi(desaSlug, body)
      }
      onBerhasil?.()
    } catch {
      setError('Gagal mengirim kontribusi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={clsx('rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700', className)}>
      <h3 className="font-semibold text-primary-800 dark:text-primary-100">
        {kontribusiRevisi ? 'Revisi kontribusi' : 'Kontribusi baru'}
      </h3>
      {target?.label && (
        <p className="mt-1 text-sm text-neutral-500">Untuk: {target.label}</p>
      )}

      {!kontribusiRevisi && (
        <div className="mt-4 flex flex-wrap gap-2">
          {TIPE.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTipe(t.id)}
              className={clsx(
                'rounded-full px-3 py-1 text-sm font-medium ring-1 transition',
                tipe === t.id
                  ? 'bg-primary-700 text-white ring-primary-700'
                  : 'bg-white text-neutral-700 ring-neutral-300 dark:bg-neutral-900',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {(tipe === 'tips' || tipe === 'ulasan' || tipe === 'foto') && (
          <textarea
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder={tipe === 'foto' ? 'Keterangan foto (opsional)' : 'Tulis di sini…'}
            rows={3}
            className="w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
        )}

        {tipe === 'foto' && (
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm dark:border-neutral-600">
              <CameraIcon className="size-5 text-neutral-500" />
              {mediaId ? 'Foto terunggah' : unggah ? 'Mengunggah…' : 'Pilih foto'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={unggah}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void unggahFoto(f)
                }}
              />
            </label>
          </div>
        )}

        {tipe === 'koreksi_data' && (
          <>
            <input
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="Field (mis. jam_operasional)"
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
            <input
              value={usulan}
              onChange={(e) => setUsulan(e.target.value)}
              placeholder="Nilai usulan"
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Alasan koreksi"
              rows={2}
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
          </>
        )}

        {tipe === 'spot_baru' && (
          <>
            <input
              value={namaSpot}
              onChange={(e) => setNamaSpot(e.target.value)}
              placeholder="Nama spot usulan"
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
            <textarea
              value={deskripsiSpot}
              onChange={(e) => setDeskripsiSpot(e.target.value)}
              placeholder="Deskripsi & lokasi"
              rows={3}
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
          </>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={loading || (tipe === 'foto' && !mediaId)}
        onClick={() => void kirim()}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
      >
        <PaperAirplaneIcon className="size-4" />
        {loading ? 'Mengirim…' : kontribusiRevisi ? 'Kirim ulang' : 'Kirim kontribusi'}
      </button>
    </div>
  )
}
