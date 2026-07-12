'use client'

import {
  buatSlot,
  buatSlotBatch,
  getSlot,
  hapusSlot,
  ubahSlot,
} from '@/lib/api/dermaga'
import { pesanGalat } from '@/lib/api/galat'
import { getDaftarPaket } from '@/lib/api/pasar'
import type { PaketRingkas, SlotJadwal } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { CalendarDaysIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

const SUBJEK_TIPE = 'paket_wisata'

export default function SlotKelolaClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.slot')
  const tr = t as unknown as (key: string) => string
  const [paket, setPaket] = useState<PaketRingkas[]>([])
  const [paketId, setPaketId] = useState<string | null>(null)
  const [slots, setSlots] = useState<SlotJadwal[]>([])
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [aksiId, setAksiId] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [mode, setMode] = useState<'tunggal' | 'batch'>('tunggal')
  const [form, setForm] = useState({
    tanggal: '',
    dari: '',
    sampai: '',
    kuota: '10',
    waktu_mulai: '08:00',
    harga_override: '',
  })

  const muatPaket = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getDaftarPaket(desaSlug, { kelola: true, status: 'publikasi' })
      setPaket(res.item)
      setPaketId((prev) => prev ?? res.item[0]?.id ?? null)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  const muatSlot = useCallback(async () => {
    if (!paketId) return
    setGalat(null)
    try {
      const res = await getSlot(desaSlug, {
        subjek_tipe: SUBJEK_TIPE,
        subjek_id: paketId,
        kelola: true,
      })
      setSlots(res.item.sort((a, b) => a.tanggal.localeCompare(b.tanggal)))
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    }
  }, [desaSlug, paketId, locale])

  useEffect(() => {
    void muatPaket()
  }, [muatPaket])

  useEffect(() => {
    if (paketId) void muatSlot()
  }, [paketId, muatSlot])

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!paketId) return
    setMenyimpan(true)
    setGalat(null)
    setSukses(null)
    const kuota = Number(form.kuota)
    const harga = form.harga_override ? Number(form.harga_override) : undefined
    const base = {
      subjek_tipe: SUBJEK_TIPE,
      subjek_id: paketId,
      kuota,
      waktu_mulai: form.waktu_mulai || undefined,
      harga_override: harga,
    }
    try {
      if (mode === 'batch') {
        await buatSlotBatch(desaSlug, { ...base, dari: form.dari, sampai: form.sampai })
        setSukses(t('suksesBatch'))
      } else {
        await buatSlot(desaSlug, { ...base, tanggal: form.tanggal })
        setSukses(t('suksesTunggal'))
      }
      await muatSlot()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMenyimpan(false)
    }
  }

  async function ubahKuota(slot: SlotJadwal, kuota: number) {
    setAksiId(slot.id)
    setGalat(null)
    try {
      await ubahSlot(desaSlug, slot.id, { kuota })
      await muatSlot()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setAksiId(null)
    }
  }

  async function hapus(slot: SlotJadwal) {
    const terpakai = slot.kuota_terpakai ?? slot.kuota - slot.sisa
    if (terpakai > 0) {
      setGalat(t('hapusTerblokir'))
      return
    }
    if (!confirm(t('hapusKonfirmasi'))) return
    setAksiId(slot.id)
    setGalat(null)
    try {
      await hapusSlot(desaSlug, slot.id)
      setSukses(t('suksesHapus'))
      await muatSlot()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setAksiId(null)
    }
  }

  const labelStatus = (s: string) => tr(`status.${s}`) || s

  if (loading) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
  }

  if (paket.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('noPaket')}</p>
  }

  return (
    <div className="space-y-8">
      <div>
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('pilihPaket')}</label>
        <select
          value={paketId ?? ''}
          onChange={(e) => setPaketId(e.target.value)}
          className="mt-1 block w-full max-w-md rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        >
          {paket.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </select>
      </div>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
        <div className="flex items-center gap-2">
          <PlusIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('formTitle')}</h3>
        </div>
        <div className="mt-3 flex gap-2">
          {(['tunggal', 'batch'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-medium',
                mode === m
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
              )}
            >
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => void simpan(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
          {mode === 'tunggal' ? (
            <label className="text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('tanggal')}</span>
              <input
                type="date"
                required
                value={form.tanggal}
                onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
              />
            </label>
          ) : (
            <>
              <label className="text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('dari')}</span>
                <input
                  type="date"
                  required
                  value={form.dari}
                  onChange={(e) => setForm((f) => ({ ...f, dari: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('sampai')}</span>
                <input
                  type="date"
                  required
                  value={form.sampai}
                  onChange={(e) => setForm((f) => ({ ...f, sampai: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
                />
              </label>
            </>
          )}
          <label className="text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('kuota')}</span>
            <input
              type="number"
              min={1}
              required
              value={form.kuota}
              onChange={(e) => setForm((f) => ({ ...f, kuota: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('waktuMulai')}</span>
            <input
              type="time"
              value={form.waktu_mulai}
              onChange={(e) => setForm((f) => ({ ...f, waktu_mulai: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{t('hargaOverride')}</span>
            <input
              type="number"
              min={0}
              placeholder={t('hargaPlaceholder')}
              value={form.harga_override}
              onChange={(e) => setForm((f) => ({ ...f, harga_override: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          <button
            type="submit"
            disabled={menyimpan}
            className="rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50 sm:col-span-2 sm:w-fit"
          >
            {menyimpan ? t('menyimpan') : t('simpan')}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="size-5 text-kiluan-sea" aria-hidden />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('daftarTitle')}</h3>
        </div>
        {slots.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
            {slots.map((slot) => {
              const terpakai = slot.kuota_terpakai ?? slot.kuota - slot.sisa
              return (
                <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {formatTanggal(slot.tanggal, locale === 'en' ? 'en-US' : 'id-ID')}
                      {slot.waktu_mulai ? ` · ${slot.waktu_mulai}` : ''}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {t('kuotaTerpakai', { terpakai, kuota: slot.kuota })}
                      {slot.harga_override != null && (
                        <> · {formatHarga(slot.harga_override, 'per_paket')}</>
                      )}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium dark:bg-neutral-800">
                      {labelStatus(slot.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={terpakai}
                      defaultValue={slot.kuota}
                      aria-label={t('ubahKuota')}
                      className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                      onBlur={(e) => {
                        const v = Number(e.target.value)
                        if (v !== slot.kuota && v >= terpakai) void ubahKuota(slot, v)
                      }}
                    />
                    <button
                      type="button"
                      disabled={aksiId === slot.id || terpakai > 0}
                      onClick={() => void hapus(slot)}
                      title={terpakai > 0 ? t('hapusTerblokir') : t('hapus')}
                      className="rounded-lg border border-red-200 p-2 text-red-600 disabled:opacity-40 dark:border-red-900 dark:text-red-400"
                    >
                      <TrashIcon className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
