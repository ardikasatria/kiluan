'use client'

import { checkout, cekKupon, buatPembayaran } from '@/lib/api/dermaga'
import { ApiError } from '@/lib/api/client'
import {
  bacaKeranjang,
  hapusKunciIdempotensi,
  kunciIdempotensi,
  kosongkanKeranjang,
  subtotalKeranjang,
  type ItemKeranjang,
} from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import { ShoppingBagIcon, TrashIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function CheckoutClient({ desaSlug, desaNama }: Props) {
  const router = useRouter()
  const [item, setItem] = useState<ItemKeranjang[]>([])
  const [nama, setNama] = useState('')
  const [telepon, setTelepon] = useState('')
  const [email, setEmail] = useState('')
  const [metodeAmbil, setMetodeAmbil] = useState<'ambil_ditempat' | 'kirim'>('ambil_ditempat')
  const [kuponKode, setKuponKode] = useState('')
  const [diskon, setDiskon] = useState(0)
  const [loading, setLoading] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    setItem(bacaKeranjang(desaSlug))
    const onCart = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d?.desa === desaSlug) setItem(bacaKeranjang(desaSlug))
    }
    window.addEventListener('kiluan-cart', onCart)
    return () => window.removeEventListener('kiluan-cart', onCart)
  }, [desaSlug])

  const subtotal = subtotalKeranjang(item)
  const total = subtotal - diskon

  async function pratinjauKupon() {
    if (!kuponKode.trim()) return
    try {
      const r = await cekKupon(desaSlug, kuponKode.trim(), subtotal)
      setDiskon(r.diskon)
    } catch {
      setDiskon(0)
      setGalat('Kupon tidak berlaku.')
    }
  }

  async function bayar() {
    if (!item.length) return
    if (!nama.trim()) {
      setGalat('Nama kontak wajib diisi.')
      return
    }
    setLoading(true)
    setGalat(null)
    const idem = kunciIdempotensi(`checkout-${desaSlug}`)
    try {
      const { pesanan } = await checkout(
        desaSlug,
        {
          kontak: { nama: nama.trim(), telepon: telepon || undefined, email: email || undefined },
          metode_ambil: metodeAmbil,
          item: item.map((it) => ({
            item_tipe: it.item_tipe,
            item_id: it.item_id,
            jumlah: it.jumlah,
            slot_jadwal_id: it.slot_jadwal_id,
            metadata: it.metadata,
          })),
          ...(kuponKode.trim() ? { kupon_kode: kuponKode.trim() } : {}),
        },
        idem,
      )
      hapusKunciIdempotensi(`checkout-${desaSlug}`)
      kosongkanKeranjang(desaSlug)
      const idemBayar = kunciIdempotensi(`bayar-${pesanan.id}`)
      await buatPembayaran(desaSlug, pesanan.id, 'transfer_manual', idemBayar)
      hapusKunciIdempotensi(`bayar-${pesanan.id}`)
      router.push(`/${desaSlug}/pesanan/${pesanan.id}`)
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === 'object' && 'galat' in (e.body as object)
          ? String((e.body as { galat?: { pesan?: string } }).galat?.pesan)
          : 'Checkout gagal. Coba lagi.'
      setGalat(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!item.length) {
    return (
      <div className="container py-16 text-center">
        <ShoppingBagIcon className="mx-auto size-12 text-neutral-300" />
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">Keranjang kosong.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <Link href={`/${desaSlug}/paket`} className="font-medium text-primary-600 hover:underline">
            Paket wisata
          </Link>
          <Link href={`/${desaSlug}/pasar`} className="font-medium text-primary-600 hover:underline">
            Pasar desa
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">Checkout</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Pembayaran online-only · kuota slot ditahan sampai batas waktu.
          </p>
        </div>
      </div>

      <div className="container grid gap-8 py-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="font-semibold text-primary-800 dark:text-primary-100">Item pesanan</h2>
            <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {item.map((it) => (
                <li key={`${it.item_id}-${it.slot_jadwal_id ?? ''}`} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{it.nama}</p>
                    <p className="text-xs text-neutral-500">
                      {it.item_tipe.replace('_', ' ')} × {it.jumlah}
                      {it.tanggal_slot && ` · ${it.tanggal_slot}`}
                      {typeof it.metadata?.jumlah_orang === 'number' &&
                        ` · ${it.metadata.jumlah_orang} orang`}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">{formatHarga(it.harga * it.jumlah, 'per_paket')}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="font-semibold text-primary-800 dark:text-primary-100">Kontak</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Nama *"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
              <input
                placeholder="Telepon / WhatsApp"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
              <input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm sm:col-span-2 dark:border-neutral-600 dark:bg-neutral-900"
              />
            </div>
            <div className="mt-4 flex gap-2">
              {(['ambil_ditempat', 'kirim'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodeAmbil(m)}
                  className={`rounded-full px-4 py-1.5 text-sm ${
                    metodeAmbil === m
                      ? 'bg-primary-700 text-white'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800'
                  }`}
                >
                  {m === 'ambil_ditempat' ? 'Ambil di tempat' : 'Kirim'}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
            <h2 className="font-semibold text-primary-800 dark:text-primary-100">Kupon</h2>
            <div className="mt-3 flex gap-2">
              <input
                placeholder="Kode kupon"
                value={kuponKode}
                onChange={(e) => setKuponKode(e.target.value)}
                className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
              <button
                type="button"
                onClick={() => void pratinjauKupon()}
                className="rounded-xl border border-primary-300 px-4 py-2.5 text-sm font-medium text-primary-700"
              >
                Cek
              </button>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
          <h2 className="font-semibold">Ringkasan</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatHarga(subtotal, 'per_paket')}</dd>
            </div>
            {diskon > 0 && (
              <div className="flex justify-between text-kiluan-sea">
                <dt>Diskon</dt>
                <dd>−{formatHarga(diskon, 'per_paket')}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold dark:border-neutral-700">
              <dt>Total</dt>
              <dd>{formatHarga(total, 'per_paket')}</dd>
            </div>
          </dl>
          {galat && <p className="mt-3 text-sm text-red-600">{galat}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={() => void bayar()}
            className="mt-6 w-full rounded-full bg-primary-700 py-3 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
          >
            {loading ? 'Memproses…' : 'Buat pesanan & lanjut bayar'}
          </button>
          <p className="mt-3 text-center text-xs text-neutral-500">
            Status lunas hanya berubah setelah verifikasi bendahara.
          </p>
        </aside>
      </div>
    </div>
  )
}
