'use client'

import { getUmkmKelola } from '@/lib/api/pasar'
import { buatRekening, getRekening, getTransaksi } from '@/lib/api/uang'
import type { RekeningDto, TransaksiDto, UmkmRingkas } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function PendapatanClient({ desaSlug }: Props) {
  const [umkm, setUmkm] = useState<UmkmRingkas | null>(null)
  const [transaksi, setTransaksi] = useState<TransaksiDto[]>([])
  const [rekening, setRekening] = useState<RekeningDto[]>([])
  const [form, setForm] = useState({ nomor: '', nama_pemilik: '', bank_kode: 'BCA' })
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    const u = await getUmkmKelola(desaSlug)
    const pertama = u.item[0] ?? null
    setUmkm(pertama)
    if (!pertama) return
    const [t, r] = await Promise.all([
      getTransaksi(desaSlug, { penyedia_tipe: 'umkm', penyedia_id: pertama.id }),
      getRekening(desaSlug, { penyedia_tipe: 'umkm', penyedia_id: pertama.id }),
    ])
    setTransaksi(t.item)
    setRekening(r.item)
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  async function simpanRekening(e: React.FormEvent) {
    e.preventDefault()
    if (!umkm) return
    setGalat(null)
    try {
      await buatRekening(desaSlug, {
        penyedia_tipe: 'umkm',
        penyedia_id: umkm.id,
        jenis: 'bank',
        nomor: form.nomor,
        nama_pemilik: form.nama_pemilik,
        bank_kode: form.bank_kode,
      })
      await muat()
      setForm({ nomor: '', nama_pemilik: '', bank_kode: 'BCA' })
    } catch {
      setGalat('Gagal menyimpan rekening.')
    }
  }

  if (!umkm) {
    return <p className="text-sm text-neutral-500">Daftarkan UMKM Anda untuk melihat pendapatan.</p>
  }

  const totalNeto = transaksi.reduce((s, t) => s + t.neto_penyedia, 0)
  const totalReinvest = transaksi.reduce((s, t) => s + t.porsi_reinvestasi, 0)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Pendapatan — {umkm.nama}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Neto {formatHarga(totalNeto, 'per_paket')} · reinvestasi {formatHarga(totalReinvest, 'per_paket')}
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h3 className="font-semibold">Ledger transaksi</h3>
        {transaksi.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Belum ada transaksi.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
            {transaksi.map((t) => (
              <li key={t.id} className="flex justify-between gap-4 py-2">
                <div>
                  <p className="font-medium capitalize">{t.jenis} · {t.status}</p>
                  <p className="text-xs text-neutral-500">
                    bruto {formatHarga(t.bruto, 'per_paket')} · fee {formatHarga(t.fee_platform, 'per_paket')}
                  </p>
                  <p className="text-xs font-medium text-kiluan-sea dark:text-kiluan-mint">
                    reinvestasi {formatHarga(t.porsi_reinvestasi, 'per_paket')}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">{formatHarga(t.neto_penyedia, 'per_paket')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h3 className="font-semibold">Rekening payout</h3>
        {rekening.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {rekening.map((r) => (
              <li key={r.id}>
                {r.nomor_mask} · {r.nama_pemilik}{' '}
                {r.terverifikasi ? (
                  <span className="text-green-600">terverifikasi</span>
                ) : (
                  <span className="text-amber-600">menunggu verifikasi bendahara</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={(e) => void simpanRekening(e)} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            placeholder="Nomor rekening"
            value={form.nomor}
            onChange={(e) => setForm((f) => ({ ...f, nomor: e.target.value }))}
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            required
          />
          <input
            placeholder="Nama pemilik"
            value={form.nama_pemilik}
            onChange={(e) => setForm((f) => ({ ...f, nama_pemilik: e.target.value }))}
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            required
          />
          {galat && <p className="text-sm text-red-600 sm:col-span-2">{galat}</p>}
          <button
            type="submit"
            className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit hover:bg-primary-800"
          >
            Tambah rekening
          </button>
        </form>
      </section>
    </div>
  )
}
