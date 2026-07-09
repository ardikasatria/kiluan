'use client'

import { formatHarga, labelVerifikasiUmkm } from '@/lib/kiluan/pasar'
import { buatProduk, getProdukKelola, getUmkmKelola, ubahStatusProduk } from '@/lib/api/pasar'
import type { ProdukJasaItem, UmkmRingkas } from '@/lib/api/types'
import { tambahAntrean } from '@/lib/offline/db'
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function UmkmKelolaClient({ desaSlug, desaNama }: Props) {
  const [umkmList, setUmkmList] = useState<UmkmRingkas[]>([])
  const [produk, setProduk] = useState<ProdukJasaItem[]>([])
  const [umkmAktif, setUmkmAktif] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formBuka, setFormBuka] = useState(false)
  const [namaProduk, setNamaProduk] = useState('')
  const [harga, setHarga] = useState('')
  const [error, setError] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const u = await getUmkmKelola(desaSlug)
      setUmkmList(u.item)
      const aktif = u.item[0]?.id ?? null
      setUmkmAktif((prev) => prev ?? aktif)
      if (aktif || u.item[0]) {
        const pid = aktif ?? u.item[0].id
        const p = await getProdukKelola(desaSlug, pid)
        setProduk(p.item)
      }
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    if (!umkmAktif) return
    void getProdukKelola(desaSlug, umkmAktif).then((p) => setProduk(p.item))
  }, [desaSlug, umkmAktif])

  const umkm = umkmList.find((u) => u.id === umkmAktif)
  const belumTerverifikasi = umkm && umkm.status_verifikasi !== 'terverifikasi'

  async function simpanProduk() {
    if (!umkmAktif || !namaProduk || !harga) return
    setError(null)
    const body = {
      umkm_id: umkmAktif,
      nama: namaProduk,
      jenis: 'produk',
      harga: Number(harga),
      satuan_harga: 'per_unit',
      stok: 10,
    }
    try {
      if (!navigator.onLine) {
        await tambahAntrean({
          desaSlug,
          method: 'POST',
          path: `/api/v1/desa/${desaSlug}/produk`,
          body: JSON.stringify(body),
        })
        setFormBuka(false)
        setNamaProduk('')
        setHarga('')
        return
      }
      await buatProduk(desaSlug, body)
      setFormBuka(false)
      setNamaProduk('')
      setHarga('')
      const p = await getProdukKelola(desaSlug, umkmAktif)
      setProduk(p.item)
    } catch {
      setError('Gagal menyimpan produk.')
    }
  }

  async function publikasi(produkId: string) {
    if (belumTerverifikasi) return
    try {
      await ubahStatusProduk(desaSlug, produkId, 'publikasi')
      const p = await getProdukKelola(desaSlug, umkmAktif!)
      setProduk(p.item)
    } catch {
      setError('Gagal mempublikasikan produk.')
    }
  }

  if (loading) {
    return <p className="container py-16 text-center text-sm text-neutral-500">Memuat…</p>
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container py-8">
          <Link
            href={`/${desaSlug}/dasbor/umkm`}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline"
          >
            <ArrowLeftIcon className="size-4" /> Dasbor UMKM
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-800 dark:text-primary-100">Produk & Jasa</h1>
          <p className="text-sm text-neutral-500">{desaNama}</p>
        </div>
      </div>

      <div className="container py-8">
        {umkmList.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Belum ada UMKM terdaftar.{' '}
            <Link href={`/${desaSlug}/saya/umkm/daftar`} className="font-medium text-primary-600 hover:underline">
              Daftarkan UMKM
            </Link>
          </p>
        ) : (
          <>
            {umkm && (
              <div className="mb-6 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
                <p className="font-medium text-primary-800 dark:text-primary-100">{umkm.nama}</p>
                <p className="text-xs text-neutral-500">{labelVerifikasiUmkm(umkm.status_verifikasi)}</p>
                {belumTerverifikasi && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    UMKM belum terverifikasi — produk hanya bisa disimpan sebagai draf hingga diverifikasi pengelola.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold text-primary-800 dark:text-primary-100">Daftar produk</h2>
              <button
                type="button"
                onClick={() => setFormBuka(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                <PlusIcon className="size-4" /> Tambah
              </button>
            </div>

            {formBuka && (
              <div className="mt-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
                <input
                  placeholder="Nama produk"
                  value={namaProduk}
                  onChange={(e) => setNamaProduk(e.target.value)}
                  className="mb-2 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                />
                <input
                  placeholder="Harga (IDR)"
                  type="number"
                  value={harga}
                  onChange={(e) => setHarga(e.target.value)}
                  className="mb-3 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => void simpanProduk()} className="rounded-lg bg-primary-700 px-4 py-2 text-sm text-white">
                    Simpan
                  </button>
                  <button type="button" onClick={() => setFormBuka(false)} className="rounded-lg px-4 py-2 text-sm text-neutral-600">
                    Batal
                  </button>
                </div>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <ul className="mt-6 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {produk.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium">{p.nama}</p>
                    <p className="text-sm text-neutral-500">{formatHarga(p.harga, p.satuan_harga)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize dark:bg-neutral-800">
                      {p.status}
                    </span>
                    {p.status === 'draft' && (
                      <button
                        type="button"
                        disabled={!!belumTerverifikasi}
                        title={belumTerverifikasi ? 'UMKM belum terverifikasi' : 'Publikasikan'}
                        onClick={() => void publikasi(p.id)}
                        className={clsx(
                          'rounded-lg px-3 py-1.5 text-xs font-medium',
                          belumTerverifikasi
                            ? 'cursor-not-allowed bg-neutral-200 text-neutral-500'
                            : 'bg-primary-700 text-white hover:bg-primary-600',
                        )}
                      >
                        Publikasi
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
