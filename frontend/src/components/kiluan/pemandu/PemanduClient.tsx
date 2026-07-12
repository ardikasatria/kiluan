'use client'

import { chatPemandu, susunItinerary } from '@/lib/api/pemandu'
import type { ItineraryItem, PemanduChatRes } from '@/lib/api/types'
import { tambahKeKeranjang, type ItemKeranjang } from '@/lib/kiluan/cart'
import { Link } from '@/i18n/navigation'
import { MapIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

const MINAT_OPSI = ['lumba', 'mangrove', 'snorkeling', 'budaya', 'kuliner'] as const

export default function PemanduClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('pemandu')
  const locale = useLocale()
  const formatRupiah = useMemo(
    () => (n: number) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n),
    [locale],
  )
  const [durasi, setDurasi] = useState(1)
  const [budget, setBudget] = useState(500000)
  const [jumlahOrang, setJumlahOrang] = useState(2)
  const [minat, setMinat] = useState<string[]>(['lumba'])
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([])
  const [perkiraan, setPerkiraan] = useState(0)
  const [modelInfo, setModelInfo] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [suksesKeranjang, setSuksesKeranjang] = useState<string | null>(null)

  const [chatSesi, setChatSesi] = useState<string | undefined>()
  const [chatInput, setChatInput] = useState('')
  const [chatRiwayat, setChatRiwayat] = useState<PemanduChatRes[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  function toggleMinat(m: string) {
    setMinat((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  const tMinat = t as unknown as (key: string) => string
  function labelMinat(m: string) {
    try {
      return tMinat(`minatOpsi.${m}`)
    } catch {
      return m
    }
  }

  async function rencanakan() {
    setLoading(true)
    setGalat(null)
    setSuksesKeranjang(null)
    try {
      const res = await susunItinerary(desaSlug, {
        durasi_hari: durasi,
        minat,
        budget,
        jumlah_orang: jumlahOrang,
      })
      setItinerary(res.itinerary)
      setPerkiraan(res.perkiraan_biaya)
      setModelInfo(`${res.model_dipakai} (konfig: ${res.mesin_konfig})`)
      setLabel(res.label)
    } catch {
      setGalat(t('error'))
    } finally {
      setLoading(false)
    }
  }

  function tambahItem(it: ItineraryItem) {
    if (it.subjek_tipe !== 'paket_wisata') return
    const item: ItemKeranjang = {
      item_tipe: 'paket_wisata',
      item_id: it.subjek_id,
      nama: it.nama || t('paketWisata'),
      harga: it.harga,
      jumlah: 1,
      slot_jadwal_id: it.slot_id,
      tanggal_slot: it.tanggal,
    }
    tambahKeKeranjang(desaSlug, item)
    setSuksesKeranjang(t('ditambahkanKeranjang', { nama: it.nama || t('paketWisata') }))
  }

  async function kirimChat() {
    if (!chatInput.trim()) return
    setChatLoading(true)
    try {
      const res = await chatPemandu(desaSlug, chatInput.trim(), chatSesi)
      setChatSesi(res.sesi_id)
      setChatRiwayat((r) => [...r, res])
      setChatInput('')
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-violet-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600">{desaNama}</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold text-primary-800 dark:text-primary-100">
            <SparklesIcon className="size-8" />
            {t('title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
      </div>

      <div className="container grid gap-10 py-10 lg:grid-cols-2">
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">{t('planTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              {t('durasi')}
              <input
                type="number"
                min={1}
                value={durasi}
                onChange={(e) => setDurasi(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
              />
            </label>
            <label className="text-sm">
              {t('jumlahOrang')}
              <input
                type="number"
                min={1}
                value={jumlahOrang}
                onChange={(e) => setJumlahOrang(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              {t('budget')}
              <input
                type="number"
                min={0}
                step={50000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
              />
            </label>
          </div>

          <div>
            <p className="text-sm font-medium">{t('minat')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MINAT_OPSI.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMinat(m)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    minat.includes(m)
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800'
                  }`}
                >
                  {labelMinat(m)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void rencanakan()}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? t('menyusun') : t('susunItinerary')}
          </button>

          {galat && <p className="text-sm text-red-600">{galat}</p>}
          {label && <p className="text-xs text-neutral-500">{label}</p>}
          {modelInfo && <p className="text-xs text-neutral-400">{t('mesin', { info: modelInfo })}</p>}

          {itinerary.length > 0 && (
            <div className="space-y-3">
              <p className="font-medium">{t('perkiraanTotal', { total: formatRupiah(perkiraan) })}</p>
              <ul className="space-y-2">
                {itinerary.map((it) => (
                  <li
                    key={it.slot_id}
                    className="flex items-center justify-between gap-3 rounded-xl border p-4 dark:border-neutral-700"
                  >
                    <div>
                      <p className="font-medium">{it.nama || t('slotPaket')}</p>
                      <p className="text-xs text-neutral-500">
                        {it.tanggal} · {formatRupiah(it.harga)}
                      </p>
                    </div>
                    {it.subjek_tipe === 'paket_wisata' && (
                      <button
                        type="button"
                        onClick={() => tambahItem(it)}
                        className="shrink-0 rounded-lg border border-primary-500 px-3 py-1 text-xs text-primary-700"
                      >
                        {t('keranjang')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {suksesKeranjang && (
                <p className="text-sm text-emerald-700">
                  {suksesKeranjang}{' '}
                  <Link href={`/${desaSlug}/checkout`} className="underline">
                    {t('checkout')}
                  </Link>
                </p>
              )}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MapIcon className="size-5" />
            {t('chatTitle')}
          </h2>
          <p className="text-xs text-neutral-500">{t('chatNote')}</p>
          <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border p-4 dark:border-neutral-700">
            {chatRiwayat.length === 0 ? (
              <p className="text-sm text-neutral-400">{t('chatEmpty')}</p>
            ) : (
              chatRiwayat.map((c, i) => (
                <div key={i} className="space-y-2 text-sm">
                  <p className="text-neutral-500">{t('chatAnda')}</p>
                  <p>{c.jawaban}</p>
                  {c.sumber.length > 0 && (
                    <p className="text-xs text-neutral-400">
                      {t('sumber', { nama: c.sumber.map((s) => s.nama).join(', ') })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void kirimChat()}
              placeholder={t('chatPlaceholder')}
              className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
            />
            <button
              type="button"
              disabled={chatLoading}
              onClick={() => void kirimChat()}
              className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-white dark:bg-neutral-200 dark:text-neutral-900"
            >
              {t('kirim')}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
