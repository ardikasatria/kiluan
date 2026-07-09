'use client'

import {
  ajukanKartu,
  revisiPengajuan,
  transisiPengajuan,
} from '@/lib/api/naik-kelas'
import { konfirmasiMedia, presignMedia, unggahKeMinio } from '@/lib/api/media'
import type { KartuAksiItem, PengajuanKartuItem } from '@/lib/api/types'
import { labelBuktiDibutuhkan } from '@/lib/kiluan/naik-kelas'
import { CameraIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface Props {
  desaSlug: string
  kartu: KartuAksiItem
  subjekTipe: 'umkm' | 'agen' | 'pokdarwis'
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
  const [pernyataan, setPernyataan] = useState(
    String(pengajuanRevisi?.bukti?.pernyataan ?? ''),
  )
  const [fotoMediaId, setFotoMediaId] = useState<string | null>(
    (pengajuanRevisi?.bukti?.foto_media_id as string) ?? null,
  )
  const [unggah, setUnggah] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const butuh = kartu.bukti_dibutuhkan ?? {}

  function bangunBukti(): Record<string, unknown> {
    const bukti: Record<string, unknown> = {}
    if (butuh.pernyataan) bukti.pernyataan = pernyataan
    if (butuh.foto && fotoMediaId) bukti.foto_media_id = fotoMediaId
    return bukti
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
      setFotoMediaId(media.id)
    } catch {
      setError('Gagal mengunggah foto.')
    } finally {
      setUnggah(false)
    }
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const bukti = bangunBukti()
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
    } catch {
      setError('Gagal mengirim pengajuan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void kirim(e)} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
      <h3 className="font-semibold text-primary-800 dark:text-primary-100">{kartu.nama}</h3>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{kartu.deskripsi}</p>
      <p className="mt-2 text-xs text-neutral-500">
        Bukti: {labelBuktiDibutuhkan(butuh).join(' · ') || '—'}
      </p>

      {butuh.foto && (
        <div className="mt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-primary-600">
            <CameraIcon className="size-5" />
            {unggah ? 'Mengunggah…' : fotoMediaId ? 'Foto terunggah ✓' : 'Unggah foto bukti'}
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

      {butuh.pernyataan && (
        <textarea
          required
          value={pernyataan}
          onChange={(e) => setPernyataan(e.target.value)}
          placeholder="Jelaskan praktik yang Anda lakukan…"
          rows={3}
          className="mt-4 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        />
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading || (butuh.foto && !fotoMediaId)}
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Mengirim…' : pengajuanRevisi ? 'Kirim ulang' : 'Ajukan kartu'}
        </button>
        {onBatal && (
          <button type="button" onClick={onBatal} className="rounded-lg border px-4 py-2 text-sm">
            Batal
          </button>
        )}
      </div>
    </form>
  )
}
