'use client'

import { checkout, cekKupon } from '@/lib/api/dermaga'
import { ApiError } from '@/lib/api/client'
import { Link, useRouter } from '@/i18n/navigation'
import {
  bacaKeranjang,
  hapusDariKeranjang,
  hapusKunciIdempotensi,
  kunciIdempotensi,
  kosongkanKeranjang,
  subtotalKeranjang,
  type ItemKeranjang,
} from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import {
  ShoppingBagIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

const inputClass =
  'w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500'

const cardClass =
  'rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/50'

export default function CheckoutClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('checkout')
  const router = useRouter()
  const [item, setItem] = useState<ItemKeranjang[]>([])
  const [nama, setNama] = useState('')
  const [telepon, setTelepon] = useState('')
  const [email, setEmail] = useState('')
  const [metodeAmbil, setMetodeAmbil] = useState<'ambil_ditempat' | 'kirim'>('ambil_ditempat')
  const [kuponKode, setKuponKode] = useState('')
  const [diskon, setDiskon] = useState(0)
  const [kuponBerlaku, setKuponBerlaku] = useState<boolean | null>(null)
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
  const total = Math.max(0, subtotal - diskon)

  function hapusBaris(it: ItemKeranjang) {
    hapusDariKeranjang(desaSlug, it.item_id, it.slot_jadwal_id)
    setItem(bacaKeranjang(desaSlug))
  }

  async function pratinjauKupon() {
    if (!kuponKode.trim()) return
    setGalat(null)
    try {
      const r = await cekKupon(desaSlug, kuponKode.trim(), subtotal)
      setKuponBerlaku(r.berlaku)
      setDiskon(r.berlaku ? r.diskon : 0)
      if (!r.berlaku) setGalat(t('errors.kupon'))
    } catch {
      setDiskon(0)
      setKuponBerlaku(false)
      setGalat(t('errors.kupon'))
    }
  }

  async function submitCheckout() {
    if (!item.length) return
    if (!nama.trim()) {
      setGalat(t('errors.nama'))
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
          ...(kuponKode.trim() && kuponBerlaku ? { kupon_kode: kuponKode.trim() } : {}),
        },
        idem,
      )
      hapusKunciIdempotensi(`checkout-${desaSlug}`)
      kosongkanKeranjang(desaSlug)
      router.push(`/${desaSlug}/pesanan/${pesanan.id}`)
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === 'object' && 'galat' in (e.body as object)
          ? String((e.body as { galat?: { pesan?: string } }).galat?.pesan)
          : t('errors.gagal')
      setGalat(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!item.length) {
    return (
      <div className="container py-16 text-center">
        <ShoppingBagIcon className="mx-auto size-12 text-neutral-300 dark:text-neutral-600" />
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">{t('empty')}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href={`/${desaSlug}/paket`}
            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {t('linkPaket')}
          </Link>
          <Link
            href={`/${desaSlug}/pasar`}
            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {t('linkPasar')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-kiluan-sea/15 via-primary-50 to-white dark:border-neutral-800 dark:from-neutral-950 dark:via-primary-950/60 dark:to-neutral-900">
        <div className="container py-10 sm:py-12">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-800 dark:text-primary-100">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
          <Link
            href={`/${desaSlug}/pesanan`}
            className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {t('riwayatLink')} →
          </Link>
        </div>
      </div>

      <div className="container grid gap-8 py-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100">
              <ShoppingBagIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
              {t('items')}
            </h2>
            <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {item.map((it) => (
                <li
                  key={`${it.item_id}-${it.slot_jadwal_id ?? ''}`}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{it.nama}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {it.item_tipe.replace('_', ' ')} × {it.jumlah}
                      {it.tanggal_slot && ` · ${it.tanggal_slot}`}
                      {typeof it.metadata?.jumlah_orang === 'number' &&
                        ` · ${t('orang', { count: it.metadata.jumlah_orang as number })}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatHarga(it.harga * it.jumlah, 'per_paket')}
                    </p>
                    <button
                      type="button"
                      onClick={() => hapusBaris(it)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      aria-label={t('hapusItem')}
                    >
                      <TrashIcon className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={cardClass}>
            <h2 className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100">
              <UserIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
              {t('contact')}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                placeholder={t('placeholder.nama')}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={inputClass}
                autoComplete="name"
              />
              <input
                placeholder={t('placeholder.telepon')}
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                className={inputClass}
                autoComplete="tel"
              />
              <input
                placeholder={t('placeholder.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={clsx(inputClass, 'sm:col-span-2')}
                autoComplete="email"
              />
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t('metodeLabel')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['ambil_ditempat', 'kirim'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodeAmbil(m)}
                  className={clsx(
                    'rounded-full px-4 py-1.5 text-sm font-medium transition',
                    metodeAmbil === m
                      ? 'bg-primary-700 text-white dark:bg-primary-600'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
                  )}
                >
                  {t(`metode.${m}`)}
                </button>
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100">
              <TagIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
              {t('kupon')}
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('kuponHint')}</p>
            <div className="mt-3 flex gap-2">
              <input
                placeholder={t('kuponPlaceholder')}
                value={kuponKode}
                onChange={(e) => {
                  setKuponKode(e.target.value)
                  setKuponBerlaku(null)
                  setDiskon(0)
                }}
                className={clsx(inputClass, 'flex-1')}
              />
              <button
                type="button"
                onClick={() => void pratinjauKupon()}
                className="shrink-0 rounded-xl border border-primary-300 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-800 hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-950/50 dark:text-primary-200 dark:hover:bg-primary-900/60"
              >
                {t('cekKupon')}
              </button>
            </div>
            {kuponBerlaku && diskon > 0 && (
              <p className="mt-2 text-sm text-kiluan-sea dark:text-kiluan-mint">
                {t('kuponPreview', { diskon: formatHarga(diskon, 'per_paket') })}
              </p>
            )}
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{t('kuponFinalNote')}</p>
          </section>
        </div>

        <aside className={clsx(cardClass, 'h-fit lg:sticky lg:top-24')}>
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('ringkasan')}</h2>
          <dl className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            <div className="flex justify-between">
              <dt>{t('subtotal')}</dt>
              <dd>{formatHarga(subtotal, 'per_paket')}</dd>
            </div>
            {diskon > 0 && (
              <div className="flex justify-between text-kiluan-sea dark:text-kiluan-mint">
                <dt>{t('diskon')}</dt>
                <dd>−{formatHarga(diskon, 'per_paket')}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-bold text-neutral-900 dark:border-neutral-700 dark:text-neutral-100">
              <dt>{t('total')}</dt>
              <dd>{formatHarga(total, 'per_paket')}</dd>
            </div>
          </dl>
          {galat && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {galat}
            </p>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => void submitCheckout()}
            className="mt-6 w-full rounded-full bg-primary-700 py-3 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-500"
          >
            {loading ? t('memproses') : t('submitOrder')}
          </button>
          <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">{t('note')}</p>
        </aside>
      </div>
    </div>
  )
}
