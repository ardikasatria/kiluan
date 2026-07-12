'use client'

import RruleBydayPicker from '@/components/kiluan/RruleBydayPicker'
import RrulePreview from '@/components/kiluan/RrulePreview'
import { cariDestinasiKelola } from '@/lib/api/destinasi'
import { kodeGalat, pesanGalat } from '@/lib/api/galat'
import {
  buatKalender,
  getKalenderDesa,
  hapusKalender,
  nonaktifkanKalender,
  ubahKalender,
} from '@/lib/api/kalender'
import type { DestinasiRingkas, KalenderBuatPayload, KalenderItem } from '@/lib/api/types'
import {
  hariDariTanggal,
  labelByday,
  normalisasiPengulangan,
  parseByday,
  type HariRrule,
} from '@/lib/kiluan/rrule'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { NoSymbolIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { FormEvent, useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  awal: KalenderItem[]
}

const FORM_KOSONG = (): KalenderBuatPayload => ({
  judul: '',
  tipe: 'harian',
  destinasi_id: null,
  waktu_mulai: '05:30',
  waktu_selesai: '07:00',
  pengulangan: { freq: 'DAILY', interval: 1 },
  berlaku_mulai: new Date().toISOString().slice(0, 10),
  berlaku_sampai: '',
  status: 'aktif',
})

export default function KelolaKalenderClient({ desaSlug, awal }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.kalender')
  const tr = t as unknown as (key: string) => string
  const [daftar, setDaftar] = useState(awal)
  const [destinasi, setDestinasi] = useState<DestinasiRingkas[]>([])
  const [form, setForm] = useState<KalenderBuatPayload>(FORM_KOSONG())
  const [editId, setEditId] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)

  const freq = String((form.pengulangan as { freq?: string })?.freq ?? 'DAILY')
  const interval = Number((form.pengulangan as { interval?: number })?.interval ?? 1)
  const byday = parseByday(form.pengulangan as Record<string, unknown>)

  const setByday = (hari: HariRrule[]) => {
    setForm((f) => ({
      ...f,
      pengulangan: { ...(f.pengulangan as object), freq, interval, byday: hari },
    }))
  }

  const setFreq = (newFreq: string) => {
    setForm((f) => {
      const peng = { ...(f.pengulangan as object), freq: newFreq, interval }
      if (newFreq === 'WEEKLY') {
        const existing = parseByday(peng)
        ;(peng as { byday?: HariRrule[] }).byday =
          existing.length > 0 ? existing : [hariDariTanggal(f.berlaku_mulai ?? new Date().toISOString().slice(0, 10))]
      } else {
        delete (peng as { byday?: unknown }).byday
      }
      return { ...f, pengulangan: peng }
    })
  }

  const muat = useCallback(async () => {
    const item = await getKalenderDesa(desaSlug)
    setDaftar(item)
  }, [desaSlug])

  useEffect(() => {
    void muat()
    void cariDestinasiKelola(desaSlug).then((r) => setDestinasi(r.item))
  }, [desaSlug, muat])

  const resetForm = () => {
    setForm(FORM_KOSONG())
    setEditId(null)
  }

  const mulaiEdit = (item: KalenderItem) => {
    const berlaku = item.berlaku_mulai ?? new Date().toISOString().slice(0, 10)
    const pengAwal = (item.pengulangan ?? { freq: 'DAILY', interval: 1 }) as Record<string, unknown>
    const freqAwal = String(pengAwal.freq ?? 'DAILY')
    let pengulangan = { ...pengAwal }
    if (freqAwal === 'WEEKLY' && parseByday(pengulangan).length === 0) {
      pengulangan = { ...pengulangan, byday: [hariDariTanggal(berlaku)] }
    }

    setEditId(item.id)
    setForm({
      judul: item.judul,
      tipe: item.tipe,
      destinasi_id: item.destinasi_id ?? null,
      waktu_mulai: item.waktu_mulai ?? '05:30',
      waktu_selesai: item.waktu_selesai ?? '07:00',
      pengulangan,
      berlaku_mulai: berlaku,
      berlaku_sampai: item.berlaku_sampai ?? '',
      status: item.status,
    })
  }

  const simpan = async (e: FormEvent) => {
    e.preventDefault()
    setGalat(null)
    setPesan(null)

    if (freq === 'WEEKLY' && byday.length === 0) {
      setGalat(t('bydayWajib'))
      return
    }

    setMenyimpan(true)
    const payload: KalenderBuatPayload = {
      ...form,
      berlaku_sampai: form.berlaku_sampai || null,
      pengulangan: normalisasiPengulangan((form.pengulangan ?? {}) as Record<string, unknown>),
    }
    try {
      if (editId) {
        await ubahKalender(desaSlug, editId, payload)
        setPesan(t('updated'))
      } else {
        await buatKalender(desaSlug, payload)
        setPesan(t('added'))
      }
      resetForm()
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(false)
    }
  }

  const nonaktifkan = async (item: KalenderItem) => {
    if (!confirm(t('nonaktifkanKonfirmasi'))) return
    setGalat(null)
    try {
      await nonaktifkanKalender(desaSlug, item.id)
      await muat()
      setPesan(t('nonaktifkanSukses'))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    }
  }

  const hapus = async (item: KalenderItem) => {
    if (!confirm(t('hapusKonfirmasi'))) return
    setGalat(null)
    try {
      await hapusKalender(desaSlug, item.id)
      if (editId === item.id) resetForm()
      await muat()
      setPesan(t('deleted'))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={simpan}
        className="max-w-2xl space-y-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700 dark:bg-neutral-800/40"
      >
        <h3 className="font-semibold text-primary-800 dark:text-primary-100">
          {editId ? t('ubah') : t('tambah')}
        </h3>
        <Field>
          <Label>{t('judul')}</Label>
          <Input
            value={form.judul}
            onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
            className="mt-1"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label>{t('tipe')}</Label>
            <Select value={form.tipe} onChange={(e) => setForm((f) => ({ ...f, tipe: e.target.value }))} className="mt-1">
              <option value="harian">{t('tipeOpsi.harian')}</option>
              <option value="musiman">{t('tipeOpsi.musiman')}</option>
              <option value="event">{t('tipeOpsi.event')}</option>
            </Select>
          </Field>
          <Field>
            <Label>{t('destinasi')}</Label>
            <Select
              value={form.destinasi_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, destinasi_id: e.target.value || null }))}
              className="mt-1"
            >
              <option value="">{t('destinasiOpsional')}</option>
              {destinasi.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>{t('pengulangan')}</Label>
            <Select value={freq} onChange={(e) => setFreq(e.target.value)} className="mt-1">
              <option value="DAILY">{t('freq.DAILY')}</option>
              <option value="WEEKLY">{t('freq.WEEKLY')}</option>
            </Select>
          </Field>
          <Field>
            <Label>{t('interval')}</Label>
            <Input
              type="number"
              min={1}
              value={interval}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pengulangan: normalisasiPengulangan({
                    ...(f.pengulangan as object),
                    freq,
                    interval: Number(e.target.value) || 1,
                    byday: freq === 'WEEKLY' ? byday : undefined,
                  }),
                }))
              }
              className="mt-1"
            />
          </Field>
          {freq === 'WEEKLY' && <RruleBydayPicker value={byday} onChange={setByday} />}
          <Field>
            <Label>{t('mulai')}</Label>
            <Input
              type="time"
              value={form.waktu_mulai ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, waktu_mulai: e.target.value }))}
              className="mt-1"
            />
          </Field>
          <Field>
            <Label>{t('selesai')}</Label>
            <Input
              type="time"
              value={form.waktu_selesai ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, waktu_selesai: e.target.value }))}
              className="mt-1"
            />
          </Field>
          <Field>
            <Label>{t('berlakuMulai')}</Label>
            <Input
              type="date"
              value={form.berlaku_mulai ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, berlaku_mulai: e.target.value }))}
              className="mt-1"
            />
          </Field>
          <Field>
            <Label>{t('berlakuSampai')}</Label>
            <Input
              type="date"
              value={form.berlaku_sampai ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, berlaku_sampai: e.target.value }))}
              className="mt-1"
            />
          </Field>
        </div>

        <RrulePreview
          freq={freq}
          interval={interval}
          byday={byday}
          berlakuMulai={form.berlaku_mulai ?? new Date().toISOString().slice(0, 10)}
          berlakuSampai={form.berlaku_sampai || undefined}
        />

        <div className="flex flex-wrap gap-2">
          <ButtonPrimary type="submit" disabled={menyimpan}>
            {menyimpan ? t('menyimpan') : editId ? t('simpanUbah') : t('simpan')}
          </ButtonPrimary>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600"
            >
              {t('batal')}
            </button>
          )}
        </div>
        {galat && <p className="text-sm text-red-700 dark:text-red-300">{galat}</p>}
        {pesan && <p className="text-sm text-primary-700 dark:text-primary-300">{pesan}</p>}
      </form>

      <ul className="space-y-3">
        {daftar.length === 0 && (
          <li className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-600">
            {t('empty')}
          </li>
        )}
        {daftar.map((k) => {
          const peng = (k.pengulangan ?? null) as Record<string, unknown> | null
          const freqLabel =
            peng && 'freq' in peng ? ` · ${tr(`freq.${String(peng.freq)}`)}` : ''
          const bydayLabel =
            peng && String(peng.freq) === 'WEEKLY'
              ? (() => {
                  const hari = parseByday(peng)
                  return hari.length ? ` · ${labelByday(hari, tr)}` : ''
                })()
              : ''

          return (
          <li key={k.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="font-medium">{k.judul}</p>
                <p className="text-sm text-neutral-500">
                  {k.waktu_mulai} – {k.waktu_selesai} · {tr(`tipeOpsi.${k.tipe}`)}
                  {freqLabel}
                  {bydayLabel}
                  {k.status === 'nonaktif' ? ` · ${t('statusNonaktif')}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => mulaiEdit(k)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs dark:border-neutral-600"
                >
                  {t('ubah')}
                </button>
                {k.status !== 'nonaktif' && (
                  <button
                    type="button"
                    onClick={() => void nonaktifkan(k)}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-700 dark:text-amber-200"
                  >
                    <NoSymbolIcon className="size-3.5" />
                    {t('nonaktifkan')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void hapus(k)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 dark:border-red-800 dark:text-red-300"
                >
                  <TrashIcon className="size-3.5" />
                  {t('hapus')}
                </button>
              </div>
            </div>
          </li>
          )
        })}
      </ul>
    </div>
  )
}
