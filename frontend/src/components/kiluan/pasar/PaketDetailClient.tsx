'use client'

import SimpanTombol from '@/components/kiluan/simpanan/SimpanTombol'
import SlotPicker from '@/components/kiluan/dermaga/SlotPicker'
import { getPaketDetail } from '@/lib/api/pasar'
import type { PaketDetail, SlotJadwal } from '@/lib/api/types'
import { tambahKeKeranjang } from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  paketIdOrSlug: string
}

export default function PaketDetailClient({ desaSlug, paketIdOrSlug }: Props) {
  const router = useRouter()
  const [paket, setPaket] = useState<PaketDetail | null>(null)
  const [slot, setSlot] = useState<SlotJadwal | null>(null)
  const [jumlahOrang, setJumlahOrang] = useState(2)
  const [sukses, setSukses] = useState(false)

  const muat = useCallback(async () => {
    const p = await getPaketDetail(desaSlug, paketIdOrSlug)
    setPaket(p)
    setJumlahOrang(Math.min(2, p.kuota_default || 2))
  }, [desaSlug, paketIdOrSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  function tambahKeranjang(lanjutCheckout: boolean) {
    if (!paket || !slot) return
    if (jumlahOrang < 1 || jumlahOrang > slot.sisa) return
    const harga = slot.harga_override ?? paket.harga
    tambahKeKeranjang(desaSlug, {
      item_tipe: 'paket_wisata',
      item_id: paket.id,
      nama: paket.nama,
      harga,
      jumlah: 1,
      slot_jadwal_id: slot.id,
      tanggal_slot: slot.tanggal,
      metadata: { jumlah_orang: jumlahOrang, tanggal: slot.tanggal },
    })
    setSukses(true)
    if (lanjutCheckout) {
      router.push(`/${desaSlug}/checkout`)
    }
  }

  if (!paket) {
    return <p className="container py-16 text-center text-sm text-neutral-500">Memuat paket…</p>
  }

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-sea/10 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <Link href={`/${desaSlug}/paket`} className="text-sm text-primary-600 hover:underline">
            ← Semua paket
          </Link>
          <p className="mt-4 text-sm text-primary-600 dark:text-primary-400">{paket.agen.nama}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-primary-800 dark:text-primary-100">{paket.nama}</h1>
            <SimpanTombol tipe="paket" entitasId={paket.id} desaSlug={desaSlug} onParentClick={false} />
          </div>
          {paket.deskripsi && (
            <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">{paket.deskripsi}</p>
          )}
          <p className="mt-4 text-2xl font-bold text-kiluan-sea dark:text-kiluan-mint">
            {formatHarga(paket.harga, paket.satuan_harga)}
          </p>
        </div>
      </div>

      <div className="container grid gap-10 py-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {paket.item?.length > 0 && (
            <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
              <h2 className="font-semibold">Itinerary</h2>
              <ol className="mt-4 space-y-3">
                {paket.item.map((it) => (
                  <li key={it.id} className="flex gap-3 text-sm">
                    <span className="shrink-0 font-medium text-primary-600">H{it.hari}</span>
                    <div>
                      <p className="font-medium">{it.judul}</p>
                      {it.deskripsi && <p className="text-neutral-500">{it.deskripsi}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
            <SlotPicker
              desaSlug={desaSlug}
              paketId={paket.id}
              hargaDefault={paket.harga}
              satuanHarga={paket.satuan_harga}
              value={slot}
              onChange={setSlot}
            />
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
          <h2 className="font-semibold">Pesan paket</h2>
          <label className="mt-4 block text-sm">
            <span className="font-medium">Jumlah orang</span>
            <input
              type="number"
              min={1}
              max={slot?.sisa ?? paket.kuota_default}
              value={jumlahOrang}
              onChange={(e) => setJumlahOrang(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-2.5 dark:border-neutral-600 dark:bg-neutral-900"
            />
          </label>
          {slot && (
            <p className="mt-2 text-xs text-neutral-500">
              Tanggal {slot.tanggal}
              {slot.waktu_mulai ? ` · ${slot.waktu_mulai.slice(0, 5)}` : ''}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              disabled={!slot}
              onClick={() => tambahKeranjang(true)}
              className="rounded-full bg-primary-700 py-3 text-sm font-semibold text-white disabled:opacity-40 hover:bg-primary-800"
            >
              Tambah & checkout
            </button>
            <button
              type="button"
              disabled={!slot}
              onClick={() => tambahKeranjang(false)}
              className="rounded-full border border-primary-300 py-3 text-sm font-semibold text-primary-700 disabled:opacity-40"
            >
              Tambah ke keranjang
            </button>
          </div>
          {sukses && (
            <p className="mt-4 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircleIcon className="size-4" />
              Ditambahkan ke keranjang.
              <Link href={`/${desaSlug}/checkout`} className="underline">
                Lihat checkout
              </Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
