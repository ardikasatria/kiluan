'use client'

import DrafLokalBanner from '@/components/kiluan/DrafLokalBanner'
import JamOperasionalEditor from '@/components/kiluan/JamOperasionalEditor'
import MapPicker from '@/components/kiluan/MapPicker'
import MediaGaleriKelola from '@/components/kiluan/MediaGaleriKelola'
import MediaUploader from '@/components/kiluan/MediaUploader'
import {
  buatDestinasi,
  hapusDestinasi,
  hapusTagDestinasi,
  setTagDestinasi,
  ubahDestinasi,
  ubahStatusDestinasi,
} from '@/lib/api/destinasi'
import { getTagDesa } from '@/lib/api/desa'
import { kodeGalat, pesanGalat } from '@/lib/api/galat'
import { getKategori } from '@/lib/api/referensi'
import type { DestinasiBuatPayload, DestinasiLengkap, Kategori, Lokasi, MediaItem, Tag } from '@/lib/api/types'
import { areaKeVertices, verticesKeArea } from '@/lib/kiluan/geo'
import { kunciDrafLokal } from '@/lib/kiluan/draf-lokal'
import { useDrafFormLokal } from '@/hooks/useDrafFormLokal'
import { tambahAntrean, simpanDrafDestinasi } from '@/lib/offline/db'
import { useRouter } from '@/i18n/navigation'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Fieldset, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Textarea from '@/shared/Textarea'
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { FormEvent, useEffect, useMemo, useState } from 'react'

interface DrafDestinasiForm {
  nama: string
  slug: string
  kategoriId: number
  deskripsi: string
  alamat: string
  status: string
  lokasi: Lokasi
  areaVerts: Lokasi[]
  jamOperasional: Record<string, string>
  tagPilih: number[]
}

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
  const locale = useLocale()
  const t = useTranslations('kelola.destinasi')
  const [nama, setNama] = useState(awal?.nama ?? '')
  const [slug, setSlug] = useState(awal?.slug ?? '')
  const [kategoriId, setKategoriId] = useState(awal?.kategori_id ?? 2)
  const [kategoriList, setKategoriList] = useState<Kategori[]>([])
  const [deskripsi, setDeskripsi] = useState(awal?.deskripsi ?? '')
  const [alamat, setAlamat] = useState(awal?.alamat ?? '')
  const [status, setStatus] = useState(awal?.status ?? 'draft')
  const [lokasi, setLokasi] = useState<Lokasi>(awal?.lokasi ?? { lat: -5.7912, lng: 105.1033 })
  const [areaVerts, setAreaVerts] = useState<Lokasi[]>(() => areaKeVertices(awal?.area))
  const [jamOperasional, setJamOperasional] = useState<Record<string, string>>(
    (awal?.jam_operasional as Record<string, string> | null) ?? {},
  )
  const [tagList, setTagList] = useState<Tag[]>([])
  const [tagPilih, setTagPilih] = useState<number[]>(awal?.tag?.map((tg) => tg.id) ?? [])
  const [media, setMedia] = useState<MediaItem[]>(awal?.media ?? [])
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  useEffect(() => {
    void getKategori().then(setKategoriList)
    void getTagDesa(desaSlug).then(setTagList)
  }, [desaSlug])

  const payload: DestinasiBuatPayload = {
    nama,
    slug: slug || slugify(nama),
    kategori_id: kategoriId,
    lokasi,
    deskripsi,
    alamat,
    jam_operasional: Object.keys(jamOperasional).length ? jamOperasional : undefined,
    area: verticesKeArea(areaVerts),
    status: status as DestinasiBuatPayload['status'],
  }

  const drafData = useMemo<DrafDestinasiForm>(
    () => ({
      nama,
      slug,
      kategoriId,
      deskripsi,
      alamat,
      status,
      lokasi,
      areaVerts,
      jamOperasional,
      tagPilih,
    }),
    [nama, slug, kategoriId, deskripsi, alamat, status, lokasi, areaVerts, jamOperasional, tagPilih],
  )

  const draf = useDrafFormLokal({
    kunci: kunciDrafLokal('destinasi', desaSlug, awal?.id ?? 'baru'),
    data: drafData,
  })

  const terapkanDraf = (d: DrafDestinasiForm) => {
    setNama(d.nama)
    setSlug(d.slug)
    setKategoriId(d.kategoriId)
    setDeskripsi(d.deskripsi)
    setAlamat(d.alamat)
    setStatus(d.status)
    setLokasi(d.lokasi)
    setAreaVerts(d.areaVerts)
    setJamOperasional(d.jamOperasional)
    setTagPilih(d.tagPilih)
  }

  const sinkronTag = async (destinasiId: string, ids: number[]) => {
    const awalIds = awal?.tag?.map((tg) => tg.id) ?? []
    const tambah = ids.filter((id) => !awalIds.includes(id))
    const hapus = awalIds.filter((id) => !ids.includes(id))
    if (tambah.length) await setTagDestinasi(desaSlug, destinasiId, tambah)
    for (const tagId of hapus) await hapusTagDestinasi(desaSlug, destinasiId, tagId)
  }

  const simpan = async (e: FormEvent) => {
    e.preventDefault()
    setMenyimpan(true)
    setGalat(null)
    setPesan(null)

    if (!navigator.onLine) {
      const draftId = awal?.id ?? `draft-${Date.now()}`
      await simpanDrafDestinasi(desaSlug, draftId, payload)
      await tambahAntrean({
        desaSlug,
        method: awal ? 'PATCH' : 'POST',
        path: awal
          ? `/api/v1/desa/${desaSlug}/destinasi/${awal.id}`
          : `/api/v1/desa/${desaSlug}/destinasi`,
        body: JSON.stringify(payload),
      })
      setPesan(t('form.offlineSaved'))
      setMenyimpan(false)
      return
    }

    try {
      if (awal) {
        await ubahDestinasi(desaSlug, awal.id, payload)
        if (tagPilih.length || awal.tag?.length) await sinkronTag(awal.id, tagPilih)
        draf.hapusDraf()
        router.push(`/${desaSlug}/kelola/destinasi`)
        router.refresh()
      } else {
        const baru = await buatDestinasi(desaSlug, payload)
        if (tagPilih.length) await setTagDestinasi(desaSlug, baru.id, tagPilih)
        draf.hapusDraf()
        router.push(`/${desaSlug}/kelola/destinasi/${baru.id}`)
        router.refresh()
      }
    } catch (err) {
      if (kodeGalat(err) === 'konflik') {
        setGalat(t('form.slugKonflik'))
      } else {
        setGalat(pesanGalat(err, locale as 'id' | 'en'))
      }
    } finally {
      setMenyimpan(false)
    }
  }

  const publikasikan = async () => {
    if (!awal) return
    setMenyimpan(true)
    setGalat(null)
    try {
      await ubahStatusDestinasi(desaSlug, awal.id, 'publikasi')
      setStatus('publikasi')
      setPesan(t('form.published'))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(false)
    }
  }

  const hapus = async () => {
    if (!awal || !confirm(t('form.hapusKonfirmasi'))) return
    setGalat(null)
    try {
      await hapusDestinasi(desaSlug, awal.id)
      router.push(`/${desaSlug}/kelola/destinasi`)
      router.refresh()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    }
  }

  const toggleTag = (tagId: number) => {
    setTagPilih((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  return (
    <form onSubmit={simpan} className="max-w-3xl space-y-8">
      <DrafLokalBanner
        menungguPulihkan={draf.menungguPulihkan}
        status={draf.status}
        diperbaruiPada={draf.diperbaruiPada}
        onPulihkan={() => {
          const data = draf.pulihkan()
          if (data) terapkanDraf(data)
        }}
        onBuang={draf.buangDraf}
      />

      <Fieldset className="grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <Label>{t('form.nama')}</Label>
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
          <Label>{t('form.slug')}</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1" required />
        </Field>
        <Field>
          <Label>{t('form.kategori')}</Label>
          <Select value={kategoriId} onChange={(e) => setKategoriId(Number(e.target.value))} className="mt-1">
            {kategoriList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <Label>{t('form.alamat')}</Label>
          <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} className="mt-1" />
        </Field>
        <Field className="sm:col-span-2">
          <Label>{t('form.deskripsi')}</Label>
          <Textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={5} className="mt-1" />
        </Field>
        <Field className="sm:col-span-2">
          <Label>{t('form.jamOperasional')}</Label>
          <div className="mt-2">
            <JamOperasionalEditor value={jamOperasional} onChange={setJamOperasional} />
          </div>
        </Field>
        <Field className="sm:col-span-2">
          <Label>{t('form.lokasi')}</Label>
          <MapPicker
            value={lokasi}
            onChange={setLokasi}
            area={areaVerts}
            onAreaChange={setAreaVerts}
            className="mt-2"
          />
        </Field>
        {tagList.length > 0 && (
          <Field className="sm:col-span-2">
            <Label>{t('form.tag')}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tagList.map((tg) => (
                <label
                  key={tg.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                    tagPilih.includes(tg.id)
                      ? 'border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
                      : 'border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={tagPilih.includes(tg.id)}
                    onChange={() => toggleTag(tg.id)}
                  />
                  {tg.nama}
                </label>
              ))}
            </div>
          </Field>
        )}
        <Field>
          <Label>{t('form.status')}</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1">
            <option value="draft">{t('status.draft')}</option>
            <option value="publikasi">{t('status.publikasi')}</option>
            <option value="arsip">{t('status.arsip')}</option>
          </Select>
        </Field>
      </Fieldset>

      {awal && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800/40 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <PhotoIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
            <h3 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t('form.galeriTitle')}</h3>
          </div>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">{t('form.galeriDesc')}</p>
          <MediaUploader
            desaSlug={desaSlug}
            entitasTipe="destinasi"
            entitasId={awal.id}
            urutanAwal={media.length}
            onBerhasil={(m) => setMedia((prev) => [...prev, m])}
          />
          <div className="mt-6">
            <MediaGaleriKelola desaSlug={desaSlug} items={media} onChange={setMedia} />
          </div>
        </section>
      )}

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {pesan && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {pesan}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonPrimary type="submit" disabled={menyimpan}>
          {menyimpan ? t('form.menyimpan') : awal ? t('form.simpanPerubahan') : t('form.simpan')}
        </ButtonPrimary>
        {awal && status !== 'publikasi' && (
          <button
            type="button"
            onClick={publikasikan}
            disabled={menyimpan}
            className="rounded-full border border-primary-600 px-5 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-900/30"
          >
            {t('form.publikasikan')}
          </button>
        )}
        {awal && (
          <button
            type="button"
            onClick={hapus}
            disabled={menyimpan}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            <TrashIcon className="size-4" aria-hidden />
            {t('form.hapus')}
          </button>
        )}
      </div>
    </form>
  )
}
