'use client'

import { formatHarga, labelStatusPaket, warnaStatusPaket } from '@/lib/kiluan/pasar'
import {
  buatPaket,
  getDaftarPaket,
  getPaketDetail,
  tambahItemPaket,
  transisiPaket,
} from '@/lib/api/pasar'
import type { PaketDetail, PaketRingkas } from '@/lib/api/types'
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function PaketKelolaClient({ desaSlug, desaNama }: Props) {
  const [daftar, setDaftar] = useState<PaketRingkas[]>([])
  const [pilih, setPilih] = useState<PaketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [formPaket, setFormPaket] = useState(false)
  const [judulItem, setJudulItem] = useState('')

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getDaftarPaket(desaSlug, { kelola: true })
      setDaftar(res.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  async function bukaPaket(id: string) {
    const d = await getPaketDetail(desaSlug, id, true)
    setPilih(d)
  }

  async function simpanPaketBaru(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const slug = String(fd.get('slug') || '')
    const nama = String(fd.get('nama') || '')
    const harga = Number(fd.get('harga') || 0)
    const durasi = Number(fd.get('durasi') || 0)
    const detail = await buatPaket(desaSlug, {
      slug,
      nama,
      harga,
      durasi_jam: durasi,
      satuan_harga: 'per_paket',
    })
    setFormPaket(false)
    setPilih(detail)
    void muat()
  }

  async function ajukan() {
    if (!pilih) return
    const d = await transisiPaket(desaSlug, pilih.id, 'ajukan')
    setPilih(d)
    void muat()
  }

  async function tambahItem() {
    if (!pilih || !judulItem) return
    const urutan = (pilih.item?.length ?? 0) + 1
    await tambahItemPaket(desaSlug, pilih.id, { hari: 1, urutan, judul: judulItem })
    setJudulItem('')
    setPilih(await getPaketDetail(desaSlug, pilih.id, true))
  }

  if (loading) {
    return <p className="container py-16 text-center text-sm text-neutral-500">Memuat…</p>
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container py-8">
          <Link href={`/${desaSlug}/dasbor/agen`} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
            <ArrowLeftIcon className="size-4" /> Dasbor Agen
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-800 dark:text-primary-100">Paket Wisata</h1>
          <p className="text-sm text-neutral-500">{desaNama}</p>
        </div>
      </div>

      <div className="container grid gap-8 py-8 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Paket saya</h2>
            <button
              type="button"
              onClick={() => setFormPaket(true)}
              className="inline-flex items-center gap-1 rounded-full bg-primary-700 px-3 py-1.5 text-sm text-white"
            >
              <PlusIcon className="size-4" /> Baru
            </button>
          </div>

          {formPaket && (
            <form onSubmit={(e) => void simpanPaketBaru(e)} className="mb-4 space-y-2 rounded-xl border p-4 dark:border-neutral-700">
              <input name="slug" placeholder="slug-paket" required className="w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
              <input name="nama" placeholder="Nama paket" required className="w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
              <input name="harga" type="number" placeholder="Harga" required className="w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
              <input name="durasi" type="number" placeholder="Durasi (jam)" required className="w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
              <button type="submit" className="rounded-lg bg-primary-700 px-4 py-2 text-sm text-white">Buat</button>
            </form>
          )}

          <ul className="space-y-2">
            {daftar.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => void bukaPaket(p.id)}
                  className={clsx(
                    'w-full rounded-xl border px-4 py-3 text-left transition',
                    pilih?.id === p.id ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30' : 'border-neutral-200 dark:border-neutral-700',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.nama}</span>
                    <span className={clsx('rounded-full px-2 py-0.5 text-xs ring-1', warnaStatusPaket(p.status))}>
                      {labelStatusPaket(p.status)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500">{formatHarga(p.harga, p.satuan_harga)}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          {pilih ? (
            <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
              <h2 className="text-lg font-bold">{pilih.nama}</h2>
              <p className="text-sm text-neutral-500">{pilih.deskripsi}</p>
              {(pilih.status === 'draft' || pilih.status === 'ditolak') && (
                <button
                  type="button"
                  onClick={() => void ajukan()}
                  className="mt-4 rounded-full bg-primary-700 px-5 py-2 text-sm font-medium text-white"
                >
                  Ajukan kurasi
                </button>
              )}

              <h3 className="mt-6 font-semibold">Itinerary</h3>
              <ol className="mt-2 space-y-2">
                {(pilih.item ?? []).map((it) => (
                  <li key={it.id} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800/50">
                    <span className="font-medium">Hari {it.hari} · #{it.urutan}</span> — {it.judul}
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex gap-2">
                <input
                  value={judulItem}
                  onChange={(e) => setJudulItem(e.target.value)}
                  placeholder="Judul aktivitas"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                />
                <button type="button" onClick={() => void tambahItem()} className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white dark:bg-neutral-200 dark:text-neutral-900">
                  +
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Pilih paket untuk mengedit itinerary.</p>
          )}
        </section>
      </div>
    </div>
  )
}
