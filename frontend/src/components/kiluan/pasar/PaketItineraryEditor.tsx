'use client'

import { pesanGalat } from '@/lib/api/galat'
import {
  getDaftarProduk,
  hapusItemPaket,
  tambahItemPaket,
  ubahItemPaket,
} from '@/lib/api/pasar'
import { cariDestinasiKelola } from '@/lib/api/destinasi'
import { getLayananDesa } from '@/lib/api/layanan'
import type { DestinasiRingkas, LayananItem, PaketItemRow, ProdukJasaItem } from '@/lib/api/types'
import { kelompokItineraryPerHari, labelItemItinerary } from '@/lib/kiluan/paket'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

type RefTipe = '' | 'destinasi' | 'layanan' | 'produk_jasa'

interface Props {
  desaSlug: string
  paketId: string
  item: PaketItemRow[]
  readOnly?: boolean
  onChange: () => void | Promise<void>
}

function refTipeItem(it: PaketItemRow): RefTipe {
  if (it.destinasi?.id) return 'destinasi'
  if (it.layanan?.id) return 'layanan'
  if (it.produk_jasa?.id) return 'produk_jasa'
  return ''
}

function refIdItem(it: PaketItemRow): string {
  return it.destinasi?.id ?? it.layanan?.id ?? it.produk_jasa?.id ?? ''
}

function bodyRef(tipe: RefTipe, id: string) {
  return {
    destinasi_id: tipe === 'destinasi' ? id || null : null,
    layanan_id: tipe === 'layanan' ? id || null : null,
    produk_jasa_id: tipe === 'produk_jasa' ? id || null : null,
  }
}

function itemValid(judul: string, tipe: RefTipe, refId: string) {
  return Boolean(judul.trim() || (tipe && refId))
}

export default function PaketItineraryEditor({ desaSlug, paketId, item, readOnly = false, onChange }: Props) {
  const t = useTranslations('pasar.paketKelola.itineraryEditor')
  const locale = useLocale()
  const [destinasi, setDestinasi] = useState<DestinasiRingkas[]>([])
  const [layanan, setLayanan] = useState<LayananItem[]>([])
  const [produk, setProduk] = useState<ProdukJasaItem[]>([])
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [hariBaru, setHariBaru] = useState(1)

  const kelompok = useMemo(() => kelompokItineraryPerHari(item), [item])

  const muatRef = useCallback(async () => {
    try {
      const [dRes, l, pRes] = await Promise.all([
        cariDestinasiKelola(desaSlug),
        getLayananDesa(desaSlug),
        getDaftarProduk(desaSlug, { batas: 100 }),
      ])
      setDestinasi(dRes.item)
      setLayanan(l)
      setProduk(pRes.item.filter((x) => x.status === 'publikasi'))
    } catch {
      /* picker opsional */
    }
  }, [desaSlug])

  useEffect(() => {
    void muatRef()
  }, [muatRef])

  async function simpanItem(itemId: string, patch: Record<string, unknown>) {
    setGalat(null)
    setMemuat(itemId)
    try {
      await ubahItemPaket(desaSlug, paketId, itemId, patch)
      await onChange()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMemuat(null)
    }
  }

  async function tambah(hari: number) {
    const urutan = item.filter((i) => i.hari === hari).length + 1
    setGalat(null)
    setMemuat('new')
    try {
      await tambahItemPaket(desaSlug, paketId, {
        hari,
        urutan,
        judul: t('defaultJudul', { urutan }),
        durasi_menit: 60,
      })
      await onChange()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMemuat(null)
    }
  }

  async function hapus(itemId: string) {
    setGalat(null)
    setMemuat(itemId)
    try {
      await hapusItemPaket(desaSlug, paketId, itemId)
      await onChange()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMemuat(null)
    }
  }

  async function geser(it: PaketItemRow, arah: -1 | 1) {
    const sehari = item.filter((i) => i.hari === it.hari).sort((a, b) => a.urutan - b.urutan)
    const idx = sehari.findIndex((i) => i.id === it.id)
    const target = sehari[idx + arah]
    if (!target) return
    setMemuat(it.id)
    try {
      await Promise.all([
        ubahItemPaket(desaSlug, paketId, it.id, { urutan: target.urutan }),
        ubahItemPaket(desaSlug, paketId, target.id, { urutan: it.urutan }),
      ])
      await onChange()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMemuat(null)
    }
  }

  async function dropPada(target: PaketItemRow) {
    if (!dragId || dragId === target.id) return
    setMemuat(dragId)
    try {
      await ubahItemPaket(desaSlug, paketId, dragId, { hari: target.hari, urutan: target.urutan })
      await onChange()
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setMemuat(null)
      setDragId(null)
    }
  }

  function opsiRef(tipe: RefTipe) {
    if (tipe === 'destinasi') return destinasi.map((d) => ({ id: d.id, nama: d.nama }))
    if (tipe === 'layanan') return layanan.map((l) => ({ id: l.id, nama: l.nama }))
    if (tipe === 'produk_jasa') return produk.map((p) => ({ id: p.id, nama: p.nama }))
    return []
  }

  return (
    <div className="space-y-4">
      {galat && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}

      {kelompok.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('empty')}</p>
      )}

      {kelompok.map(({ hari, item: rows }) => (
        <section
          key={hari}
          className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30"
          aria-label={t('dayGroup', { hari })}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-100">{t('dayLabel', { hari })}</h4>
            {!readOnly && (
              <button
                type="button"
                onClick={() => void tambah(hari)}
                disabled={memuat === 'new'}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-300"
              >
                <PlusIcon className="size-3.5" aria-hidden />
                {t('addActivity')}
              </button>
            )}
          </div>

          <ol className="space-y-3">
            {rows.map((it, idx) => (
              <ItemBaris
                key={it.id}
                it={it}
                idx={idx}
                total={rows.length}
                readOnly={readOnly}
                memuat={memuat === it.id}
                onGeser={(a) => void geser(it, a)}
                onHapus={() => void hapus(it.id)}
                onDrop={() => void dropPada(it)}
                onDragStart={() => setDragId(it.id)}
                onDragEnd={() => setDragId(null)}
                dragOver={dragId !== null && dragId !== it.id}
                t={t}
                refTipe={refTipeItem(it)}
                refId={refIdItem(it)}
                opsiRef={opsiRef}
                onSimpan={(patch) => void simpanItem(it.id, patch)}
              />
            ))}
          </ol>
        </section>
      ))}

      {!readOnly && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-600">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-neutral-700 dark:text-neutral-300">{t('newDay')}</span>
            <input
              type="number"
              min={1}
              value={hariBaru}
              onChange={(e) => setHariBaru(Number(e.target.value))}
              className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          <button
            type="button"
            onClick={() => void tambah(hariBaru)}
            className="rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            {t('addDay')}
          </button>
        </div>
      )}
    </div>
  )
}

interface BarisProps {
  it: PaketItemRow
  idx: number
  total: number
  readOnly: boolean
  memuat: boolean
  refTipe: RefTipe
  refId: string
  opsiRef: (t: RefTipe) => { id: string; nama: string }[]
  t: ReturnType<typeof useTranslations<'pasar.paketKelola.itineraryEditor'>>
  onGeser: (arah: -1 | 1) => void
  onHapus: () => void
  onSimpan: (patch: Record<string, unknown>) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
  dragOver: boolean
}

function ItemBaris({
  it,
  idx,
  total,
  readOnly,
  memuat,
  refTipe: refTipeAwal,
  refId: refIdAwal,
  opsiRef,
  t,
  onGeser,
  onHapus,
  onSimpan,
  onDragStart,
  onDragEnd,
  onDrop,
  dragOver,
}: BarisProps) {
  const [judul, setJudul] = useState(it.judul ?? '')
  const [deskripsi, setDeskripsi] = useState(it.deskripsi ?? '')
  const [durasi, setDurasi] = useState(it.durasi_menit ?? 0)
  const [refTipe, setRefTipe] = useState<RefTipe>(refTipeAwal)
  const [refId, setRefId] = useState(refIdAwal)

  useEffect(() => {
    setJudul(it.judul ?? '')
    setDeskripsi(it.deskripsi ?? '')
    setDurasi(it.durasi_menit ?? 0)
    setRefTipe(refTipeAwal)
    setRefId(refIdAwal)
  }, [it, refTipeAwal, refIdAwal])

  function commit() {
    if (!itemValid(judul, refTipe, refId)) return
    onSimpan({
      judul,
      deskripsi,
      durasi_menit: durasi,
      ...bodyRef(refTipe, refId),
    })
  }

  if (readOnly) {
    return (
      <li className="rounded-lg border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-700 dark:bg-neutral-900/50">
        <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
          #{it.urutan}
          {it.durasi_menit ? ` · ${t('minutes', { count: it.durasi_menit })}` : ''}
        </p>
        <p className="mt-1 font-medium text-neutral-800 dark:text-neutral-100">{labelItemItinerary(it)}</p>
        {it.deskripsi && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{it.deskripsi}</p>}
      </li>
    )
  }

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      className={clsx(
        'rounded-lg border bg-white p-3 dark:bg-neutral-900/50',
        dragOver ? 'border-primary-400 ring-2 ring-primary-200 dark:ring-primary-800' : 'border-neutral-200 dark:border-neutral-700',
        memuat && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            aria-label={t('moveUp')}
            disabled={idx === 0 || memuat}
            onClick={() => onGeser(-1)}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ArrowUpIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t('moveDown')}
            disabled={idx >= total - 1 || memuat}
            onClick={() => onGeser(1)}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ArrowDownIcon className="size-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              onBlur={commit}
              placeholder={t('titlePlaceholder')}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
            <input
              type="number"
              min={0}
              value={durasi}
              onChange={(e) => setDurasi(Number(e.target.value))}
              onBlur={commit}
              placeholder={t('durationPlaceholder')}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
          </div>
          <textarea
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            onBlur={commit}
            rows={2}
            placeholder={t('descPlaceholder')}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={refTipe}
              onChange={(e) => {
                setRefTipe(e.target.value as RefTipe)
                setRefId('')
              }}
              onBlur={commit}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            >
              <option value="">{t('refNone')}</option>
              <option value="destinasi">{t('refDestinasi')}</option>
              <option value="layanan">{t('refLayanan')}</option>
              <option value="produk_jasa">{t('refProduk')}</option>
            </select>
            {refTipe && (
              <select
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
                onBlur={commit}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              >
                <option value="">{t('refPick')}</option>
                {opsiRef(refTipe).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nama}
                  </option>
                ))}
              </select>
            )}
          </div>
          {!itemValid(judul, refTipe, refId) && (
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('validation')}</p>
          )}
        </div>

        <button
          type="button"
          aria-label={t('delete')}
          disabled={memuat}
          onClick={onHapus}
          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
    </li>
  )
}
