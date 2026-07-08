'use client'

import MapPicker from '@/components/kiluan/MapPicker'
import { buatDestinasi, ubahDestinasi, ubahStatusDestinasi } from '@/lib/api/destinasi'
import type { DestinasiBuatPayload, DestinasiLengkap, Lokasi } from '@/lib/api/types'
import { tambahAntrean, simpanDrafDestinasi } from '@/lib/offline/db'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Fieldset, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Textarea from '@/shared/Textarea'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

function slugify(nama: string) {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

interface Props {
  desaSlug: string
  awal?: DestinasiLengkap
}

export default function DestinasiForm({ desaSlug, awal }: Props) {
  const router = useRouter()
  const [nama, setNama] = useState(awal?.nama ?? '')
  const [slug, setSlug] = useState(awal?.slug ?? '')
  const [kategoriId, setKategoriId] = useState(awal?.kategori_id ?? 2)
  const [deskripsi, setDeskripsi] = useState(awal?.deskripsi ?? '')
  const [alamat, setAlamat] = useState(awal?.alamat ?? '')
  const [status, setStatus] = useState(awal?.status ?? 'draft')
  const [lokasi, setLokasi] = useState<Lokasi>(awal?.lokasi ?? { lat: -5.7912, lng: 105.1033 })
  const [menyimpan, setMenyimpan] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)

  const payload: DestinasiBuatPayload = {
    nama,
    slug: slug || slugify(nama),
    kategori_id: kategoriId,
    lokasi,
    deskripsi,
    alamat,
    status: status as DestinasiBuatPayload['status'],
  }

  const simpan = async (e: FormEvent) => {
    e.preventDefault()
    setMenyimpan(true)
    setPesan(null)
    const draftId = awal?.id ?? `draft-${Date.now()}`
    await simpanDrafDestinasi(desaSlug, draftId, payload)

    if (!navigator.onLine) {
      await tambahAntrean({
        desaSlug,
        method: awal ? 'PATCH' : 'POST',
        path: awal
          ? `/api/v1/desa/${desaSlug}/destinasi/${awal.id}`
          : `/api/v1/desa/${desaSlug}/destinasi`,
        body: JSON.stringify(payload),
      })
      setPesan('Disimpan offline — akan disinkronkan saat online.')
      setMenyimpan(false)
      return
    }

    try {
      if (awal) {
        await ubahDestinasi(desaSlug, awal.id, payload)
      } else {
        await buatDestinasi(desaSlug, payload)
      }
      router.push(`/${desaSlug}/kelola/destinasi`)
      router.refresh()
    } catch {
      await tambahAntrean({
        desaSlug,
        method: awal ? 'PATCH' : 'POST',
        path: awal
          ? `/api/v1/desa/${desaSlug}/destinasi/${awal.id}`
          : `/api/v1/desa/${desaSlug}/destinasi`,
        body: JSON.stringify(payload),
      })
      setPesan('API tidak tersedia — disimpan ke antrean offline.')
    } finally {
      setMenyimpan(false)
    }
  }

  const publikasikan = async () => {
    if (!awal) return
    setMenyimpan(true)
    try {
      await ubahStatusDestinasi(desaSlug, awal.id, 'publikasi')
      setStatus('publikasi')
      setPesan('Destinasi dipublikasikan.')
    } catch {
      setPesan('Gagal mempublikasikan — coba lagi saat online.')
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <form onSubmit={simpan} className="max-w-3xl space-y-6">
      <Fieldset className="grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <Label>Nama destinasi</Label>
          <Input
            value={nama}
            onChange={(e) => {
              setNama(e.target.value)
              if (!awal) setSlug(slugify(e.target.value))
            }}
            className="mt-1"
            required
          />
        </Field>
        <Field>
          <Label>Slug URL</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1" required />
        </Field>
        <Field>
          <Label>Kategori</Label>
          <Select value={kategoriId} onChange={(e) => setKategoriId(Number(e.target.value))} className="mt-1">
            <option value={1}>Snorkeling</option>
            <option value={2}>Pantai</option>
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <Label>Alamat</Label>
          <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} className="mt-1" />
        </Field>
        <Field className="sm:col-span-2">
          <Label>Deskripsi</Label>
          <Textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={5} className="mt-1" />
        </Field>
        <Field className="sm:col-span-2">
          <Label>Lokasi (titik)</Label>
          <MapPicker value={lokasi} onChange={setLokasi} className="mt-2" />
        </Field>
        <Field>
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1">
            <option value="draft">Draft</option>
            <option value="publikasi">Publikasi</option>
            <option value="arsip">Arsip</option>
          </Select>
        </Field>
      </Fieldset>

      {pesan && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {pesan}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonPrimary type="submit" disabled={menyimpan}>
          {menyimpan ? 'Menyimpan…' : awal ? 'Simpan perubahan' : 'Buat destinasi'}
        </ButtonPrimary>
        {awal && status !== 'publikasi' && (
          <button
            type="button"
            onClick={publikasikan}
            disabled={menyimpan}
            className="rounded-full border border-primary-600 px-5 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-900/30"
          >
            Publikasikan
          </button>
        )}
      </div>
    </form>
  )
}
