'use client'

import { buatHadiah, buatKuponKampanye, getHadiah } from '@/lib/api/poin'
import type { HadiahDto } from '@/lib/api/types'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function KelolaHadiahClient({ desaSlug }: Props) {
  const [hadiah, setHadiah] = useState<HadiahDto[]>([])
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    const h = await getHadiah(desaSlug)
    setHadiah(h.item)
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  async function tambahHadiah(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setGalat(null)
    try {
      await buatHadiah(desaSlug, {
        nama: String(fd.get('nama')),
        jenis: String(fd.get('jenis')),
        biaya_poin: Number(fd.get('biaya')),
        stok: fd.get('stok') ? Number(fd.get('stok')) : undefined,
      })
      e.currentTarget.reset()
      await muat()
    } catch {
      setGalat('Gagal menambah hadiah.')
    }
  }

  async function tambahKupon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setGalat(null)
    try {
      await buatKuponKampanye(desaSlug, {
        kode: String(fd.get('kode')),
        nilai: Number(fd.get('nilai')),
        tipe_diskon: 'nominal',
        min_belanja: fd.get('min') ? Number(fd.get('min')) : undefined,
      })
      e.currentTarget.reset()
    } catch {
      setGalat('Gagal membuat kupon.')
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Katalog hadiah</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {hadiah.map((h) => (
            <li key={h.id}>
              {h.nama} · {h.biaya_poin} poin · {h.jenis}
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => void tambahHadiah(e)} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input name="nama" placeholder="Nama hadiah" required className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
          <select name="jenis" className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900">
            <option value="merchandise">Merchandise</option>
            <option value="kupon_diskon">Kupon diskon</option>
            <option value="tiket">Tiket</option>
          </select>
          <input name="biaya" type="number" placeholder="Biaya poin" required className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
          <input name="stok" type="number" placeholder="Stok (opsional)" className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
          <button type="submit" className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit">
            Tambah hadiah
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Kupon kampanye</h2>
        <form onSubmit={(e) => void tambahKupon(e)} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input name="kode" placeholder="Kode kupon" required className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
          <input name="nilai" type="number" placeholder="Nilai diskon (Rp)" required className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
          <input name="min" type="number" placeholder="Min belanja (opsional)" className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
          <button type="submit" className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit">
            Buat kupon kampanye
          </button>
        </form>
      </section>

      {galat && <p className="text-sm text-red-600">{galat}</p>}
    </div>
  )
}
