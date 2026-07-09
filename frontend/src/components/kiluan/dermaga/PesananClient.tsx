'use client'

import { getPesanan, unggahBuktiPembayaran, buatPembayaran } from '@/lib/api/dermaga'
import { ajukanRefund } from '@/lib/api/uang'
import { konfirmasiMedia, presignMedia, unggahKeMinio } from '@/lib/api/media'
import type { PembayaranDto, PesananRingkas } from '@/lib/api/types'
import { kunciIdempotensi, hapusKunciIdempotensi } from '@/lib/kiluan/cart'
import { formatHarga } from '@/lib/kiluan/pasar'
import { ClockIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  pesananId: string
}

function qrUrl(kode: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(kode)}`
}

function sisaDetik(iso: string | null | undefined) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.floor(ms / 1000)
}

export default function PesananClient({ desaSlug, pesananId }: Props) {
  const [pesanan, setPesanan] = useState<PesananRingkas | null>(null)
  const [pembayaran, setPembayaran] = useState<PembayaranDto | null>(null)
  const [sisa, setSisa] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [alasanRefund, setAlasanRefund] = useState('')
  const [refundSukses, setRefundSukses] = useState(false)

  const muat = useCallback(async () => {
    const p = await getPesanan(desaSlug, pesananId)
    setPesanan(p)
    setSisa(sisaDetik(p.kedaluwarsa_pada))
    if (p.status === 'menunggu_pembayaran' && !pembayaran) {
      const idem = kunciIdempotensi(`bayar-${p.id}`)
      try {
        const { pembayaran: pay } = await buatPembayaran(desaSlug, p.id, 'transfer_manual', idem)
        setPembayaran(pay)
        hapusKunciIdempotensi(`bayar-${p.id}`)
      } catch {
        /* sudah ada upaya bayar */
      }
    }
  }, [desaSlug, pesananId, pembayaran])

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    if (sisa == null || sisa <= 0) return
    const t = setInterval(() => setSisa((x) => (x != null && x > 0 ? x - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [sisa])

  async function unggahBukti(file: File) {
    if (!pembayaran) return
    setUploading(true)
    setGalat(null)
    try {
      const pre = await presignMedia(desaSlug, file)
      await unggahKeMinio(pre.url_unggah, file)
      const media = await konfirmasiMedia(desaSlug, {
        media_id: pre.media_id,
        tipe: file.type.startsWith('video/') ? 'video' : 'foto',
        alt: file.name.replace(/\.[^.]+$/, ''),
      })
      await unggahBuktiPembayaran(desaSlug, pembayaran.id, media.id)
      await muat()
    } catch {
      setGalat('Gagal mengunggah bukti.')
    } finally {
      setUploading(false)
    }
  }

  async function ajukanRefundPesanan() {
    if (!alasanRefund.trim()) return
    setGalat(null)
    const idem = kunciIdempotensi(`refund-${pesananId}`)
    try {
      await ajukanRefund(desaSlug, { pesanan_id: pesananId, alasan: alasanRefund.trim() }, idem)
      hapusKunciIdempotensi(`refund-${pesananId}`)
      setRefundSukses(true)
      await muat()
    } catch {
      setGalat('Pengajuan refund gagal.')
    }
  }

  if (!pesanan) {
    return <p className="container py-16 text-center text-sm text-neutral-500">Memuat pesanan…</p>
  }

  const bookings = (pesanan.item ?? []).filter((it) => it.booking)

  return (
    <div className="container max-w-2xl py-10 pb-20">
      <p className="text-sm text-primary-600">Pesanan {pesanan.kode_pesanan}</p>
      <h1 className="mt-1 text-2xl font-bold capitalize text-primary-800 dark:text-primary-100">
        {pesanan.status.replace(/_/g, ' ')}
      </h1>

      {pesanan.status === 'menunggu_pembayaran' && sisa != null && (
        <p className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <ClockIcon className="size-4" />
          {sisa > 0
            ? `Bayar dalam ${Math.floor(sisa / 60)}:${String(sisa % 60).padStart(2, '0')}`
            : 'Batas waktu pembayaran habis'}
        </p>
      )}

      <p className="mt-4 text-lg font-semibold">{formatHarga(pesanan.total, 'per_paket')}</p>

      {pembayaran?.instruksi_qris_statis && pesanan.status === 'menunggu_pembayaran' && (
        <section className="mt-8 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
          <h2 className="font-semibold">Transfer manual</h2>
          <p className="mt-2 text-sm text-neutral-600">{pembayaran.instruksi_qris_statis.catatan}</p>
          <div className="mt-4 flex justify-center">
            <Image
              src={pembayaran.instruksi_qris_statis.url}
              alt="QRIS"
              width={200}
              height={200}
              className="rounded-lg border"
              unoptimized
            />
          </div>
          <label className="mt-6 block">
            <span className="text-sm font-medium">Unggah bukti transfer</span>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void unggahBukti(f)
              }}
            />
          </label>
          {galat && <p className="mt-2 text-sm text-red-600">{galat}</p>}
          <p className="mt-3 text-xs text-neutral-500">
            Konfirmasi lunas hanya oleh bendahara Pokdarwis — bukan otomatis setelah upload.
          </p>
        </section>
      )}

      {['dibayar', 'diproses'].includes(pesanan.status) && (
        <section className="mt-8 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
          <h2 className="font-semibold">Ajukan refund</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Refund setelah kunjungan selesai memerlukan persetujuan manual bendahara.
          </p>
          {refundSukses ? (
            <p className="mt-3 text-sm text-green-700">Pengajuan terkirim — menunggu keputusan pengelola.</p>
          ) : (
            <>
              <textarea
                value={alasanRefund}
                onChange={(e) => setAlasanRefund(e.target.value)}
                placeholder="Alasan pembatalan…"
                rows={3}
                className="mt-3 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
              <button
                type="button"
                onClick={() => void ajukanRefundPesanan()}
                className="mt-3 rounded-full border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700"
              >
                Ajukan refund
              </button>
            </>
          )}
        </section>
      )}

      {bookings.length > 0 && (
        <section className="mt-8 space-y-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <QrCodeIcon className="size-5" />
            Tiket check-in
          </h2>
          {bookings.map((it) => (
            <div
              key={it.id}
              className="flex flex-col items-center rounded-2xl border border-neutral-200 p-6 sm:flex-row sm:gap-6 dark:border-neutral-700"
            >
              {it.booking && (
                <>
                  <Image
                    src={qrUrl(it.booking.kode_checkin)}
                    alt="QR tiket"
                    width={140}
                    height={140}
                    unoptimized
                  />
                  <div className="mt-4 text-center sm:mt-0 sm:text-left">
                    <p className="font-medium">{it.nama_snapshot}</p>
                    <p className="mt-1 font-mono text-lg tracking-wider">{it.booking.kode_checkin}</p>
                    <p className="mt-1 text-xs capitalize text-neutral-500">{it.booking.status}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
