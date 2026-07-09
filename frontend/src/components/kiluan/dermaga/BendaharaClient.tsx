'use client'

import { daftarPembayaranAntrean, konfirmasiManual } from '@/lib/api/dermaga'
import { buatPayout, getPayout, getRekening, getTransaksi, transisiPayout, verifikasiRekening } from '@/lib/api/uang'
import type { PembayaranDto, PayoutDto, RekeningDto, TransaksiDto } from '@/lib/api/types'
import { kunciIdempotensi, hapusKunciIdempotensi } from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import { BanknotesIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function BendaharaClient({ desaSlug }: Props) {
  const [antrean, setAntrean] = useState<PembayaranDto[]>([])
  const [transaksi, setTransaksi] = useState<TransaksiDto[]>([])
  const [rekening, setRekening] = useState<RekeningDto[]>([])
  const [payout, setPayout] = useState<PayoutDto[]>([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [a, t, p] = await Promise.all([
        daftarPembayaranAntrean(desaSlug),
        getTransaksi(desaSlug, { status: 'dirilis' }),
        getPayout(desaSlug),
      ])
      setAntrean(a.item)
      setTransaksi(t.item)
      setPayout(p.item)
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  const grupDirilis = useMemo(() => {
    const m = new Map<string, { tipe: string; id: string; neto: number }>()
    for (const t of transaksi) {
      if (t.payout_id) continue
      const k = `${t.penyedia.tipe}:${t.penyedia.id}`
      const ada = m.get(k) ?? { tipe: t.penyedia.tipe, id: t.penyedia.id, neto: 0 }
      ada.neto += t.neto_penyedia
      m.set(k, ada)
    }
    return [...m.values()]
  }, [transaksi])

  async function konfirmasi(pay: PembayaranDto) {
    setGalat(null)
    const idem = kunciIdempotensi(`konf-${pay.id}`)
    try {
      await konfirmasiManual(desaSlug, pay.id, idem)
      hapusKunciIdempotensi(`konf-${pay.id}`)
      await muat()
    } catch {
      setGalat('Konfirmasi gagal.')
    }
  }

  async function muatRekening(ptipe: string, pid: string) {
    const r = await getRekening(desaSlug, { penyedia_tipe: ptipe, penyedia_id: pid })
    setRekening(r.item)
  }

  async function verifikasiRek(rekeningId: string) {
    await verifikasiRekening(desaSlug, rekeningId, true)
    await muat()
  }

  async function jalankanPayout(ptipe: string, pid: string, rekeningId: string) {
    setGalat(null)
    const idem = kunciIdempotensi(`payout-${ptipe}-${pid}`)
    try {
      const { payout: po } = await buatPayout(
        desaSlug,
        { penyedia_tipe: ptipe, penyedia_id: pid, rekening_id: rekeningId, metode: 'manual' },
        idem,
      )
      hapusKunciIdempotensi(`payout-${ptipe}-${pid}`)
      await transisiPayout(desaSlug, po.id, 'tandai_berhasil')
      await muat()
    } catch {
      setGalat('Payout gagal — pastikan rekening terverifikasi.')
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Memuat panel bendahara…</p>
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center gap-2">
          <CheckBadgeIcon className="size-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Konfirmasi pembayaran manual</h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Verifikasi bukti transfer — pembeli tidak bisa mengonfirmasi sendiri.
        </p>
        {galat && <p className="mt-2 text-sm text-red-600">{galat}</p>}
        {antrean.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Tidak ada pembayaran menunggu verifikasi.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
            {antrean.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{formatHarga(p.jumlah, 'per_paket')}</p>
                  <p className="text-xs text-neutral-500">
                    {p.metode} · bukti {p.bukti_media_id ? 'terunggah' : 'belum ada'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!p.bukti_media_id}
                  onClick={() => void konfirmasi(p)}
                  className="rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-primary-800"
                >
                  Konfirmasi lunas
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2">
          <BanknotesIcon className="size-5 text-kiluan-sea" />
          <h2 className="text-lg font-semibold">Payout penyedia</h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Cairkan transaksi <code className="text-xs">dirilis</code> ke rekening terverifikasi (transfer manual).
        </p>
        {grupDirilis.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Belum ada dana dirilis untuk dicairkan.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {grupDirilis.map((g) => (
              <li key={`${g.tipe}:${g.id}`} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                <p className="font-medium">
                  {g.tipe} · neto {formatHarga(g.neto, 'per_paket')}
                </p>
                <button
                  type="button"
                  className="mt-2 text-sm text-primary-600 hover:underline"
                  onClick={() => void muatRekening(g.tipe, g.id)}
                >
                  Muat rekening penyedia
                </button>
                {rekening.length > 0 && rekening[0]?.penyedia.id === g.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rekening.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!r.terverifikasi}
                          onClick={() => void jalankanPayout(g.tipe, g.id, r.id)}
                          className="rounded-lg border border-primary-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                        >
                          {r.nomor_mask} {r.terverifikasi ? '✓' : '(belum verifikasi)'}
                        </button>
                        {!r.terverifikasi && (
                          <button
                            type="button"
                            onClick={() => void verifikasiRek(r.id)}
                            className="text-xs text-primary-600 hover:underline"
                          >
                            Verifikasi rekening
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {payout.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold">Riwayat payout</h3>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              {payout.slice(0, 5).map((p) => (
                <li key={p.id}>
                  {formatHarga(p.jumlah, 'per_paket')} · {p.status} · {p.penyedia.tipe}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
