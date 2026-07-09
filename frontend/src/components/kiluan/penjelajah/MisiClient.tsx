'use client'

import OfflineIndicator from '@/components/kiluan/OfflineIndicator'
import {
  ambilLokasi,
  getMisi,
  getMisiDetail,
  getPasporSaya,
  selesaiMisi,
  unggahBuktiFoto,
} from '@/lib/api/penjelajah'
import type { MisiDetail, MisiRingkas, MisiSelesaiPayload } from '@/lib/api/types'
import {
  AcademicCapIcon,
  CheckBadgeIcon,
  MapPinIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

const KATEGORI = [
  { kode: '', label: 'Semua' },
  { kode: 'mangrove', label: 'Mangrove' },
  { kode: 'karang', label: 'Karang' },
  { kode: 'sampah', label: 'Sampah' },
  { kode: 'lumba', label: 'Lumba-lumba' },
  { kode: 'budaya', label: 'Budaya' },
] as const

function labelKategori(k: string) {
  return KATEGORI.find((c) => c.kode === k)?.label ?? k
}

export default function MisiClient({ desaSlug, desaNama }: Props) {
  const [kategori, setKategori] = useState('')
  const [misi, setMisi] = useState<MisiRingkas[]>([])
  const [loading, setLoading] = useState(true)
  const [pilih, setPilih] = useState<MisiDetail | null>(null)
  const [pelajaranKat, setPelajaranKat] = useState<Set<string>>(new Set())
  const [katUnlock, setKatUnlock] = useState<Set<string>>(new Set())
  const [qrToken, setQrToken] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [proses, setProses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [res, belajar] = await Promise.all([
        getMisi(desaSlug, kategori ? { kategori } : undefined),
        getMisi(desaSlug, { jenis: 'belajar' }),
      ])
      setMisi(res.item)
      const belajarMap = new Map(belajar.item.map((m) => [m.id, m.kategori]))
      try {
        const paspor = await getPasporSaya(desaSlug)
        const kat = new Set<string>()
        for (const s of paspor.stempel) {
          const k = belajarMap.get(s.misi_id)
          if (k) kat.add(k)
        }
        setKatUnlock(kat)
      } catch {
        setKatUnlock(new Set())
      }
    } finally {
      setLoading(false)
    }
  }, [desaSlug, kategori])

  useEffect(() => {
    void muat()
  }, [muat])

  const belajarSelesai = useMemo(() => new Set([...katUnlock, ...pelajaranKat]), [katUnlock, pelajaranKat])

  async function bukaMisi(id: string) {
    setGalat(null)
    setSukses(null)
    setQrToken('')
    setFoto(null)
    const { misi: d } = await getMisiDetail(desaSlug, id)
    setPilih(d)
    if (d.jenis === 'belajar') setPelajaranKat((s) => new Set(s).add(d.kategori))
  }

  function bisaAksi(m: MisiRingkas) {
    if (m.jenis === 'belajar') return true
    return belajarSelesai.has(m.kategori)
  }

  async function selesaikan() {
    if (!pilih) return
    setProses(true)
    setGalat(null)
    setSukses(null)
    try {
      const syarat = pilih.syarat_verifikasi ?? {}
      const metode = (syarat.metode as string) ?? 'otomatis'
      const butuhFoto = Boolean((syarat.bukti as Record<string, unknown>)?.foto)
      const bukti: MisiSelesaiPayload['bukti'] = {}

      if (metode === 'qr_checkin') {
        if (!qrToken.trim()) {
          setGalat('Masukkan atau pindai token QR stasiun.')
          return
        }
        bukti.qr_token = qrToken.trim()
        try {
          bukti.lokasi = await ambilLokasi()
        } catch {
          setGalat('Izinkan akses lokasi untuk verifikasi geofence.')
          return
        }
      }

      if (butuhFoto) {
        if (!foto) {
          setGalat('Unggah foto bukti aksi.')
          return
        }
        bukti.foto_media_id = await unggahBuktiFoto(desaSlug, foto)
      }

      const res = await selesaiMisi(desaSlug, pilih.id, {
        bukti,
        dampak: pilih.dampak_template as Record<string, number>,
      })

      if (res.offline) {
        setSukses('Tersimpan offline — akan disinkron saat online.')
      } else if (res.stempel.status === 'terverifikasi') {
        setSukses('Misi selesai! Stempel terverifikasi masuk paspor Anda.')
      } else {
        setSukses('Misi dicatat — menunggu konfirmasi pemandu.')
      }
      setPilih(null)
      await muat()
    } catch {
      setGalat('Gagal menyelesaikan misi — cek QR, lokasi, atau bukti.')
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-primary-600">{desaNama}</p>
              <h1 className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-100">
                Misi sigerciv
              </h1>
              <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
                Belajar kode etik → aksi di lapangan. Hanya stempel terverifikasi masuk Paspor
                Lestari.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <OfflineIndicator desaSlug={desaSlug} />
              <Link href={`/${desaSlug}/paspor`} className="text-sm text-primary-600 hover:underline">
                Buka Paspor Lestari →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {KATEGORI.map((k) => (
            <button
              key={k.kode || 'all'}
              type="button"
              onClick={() => setKategori(k.kode)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                kategori === k.kode
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500">Memuat misi…</p>
        ) : misi.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada misi aktif di desa ini.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {misi.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => void bukaMisi(m.id)}
                className="rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary-600">
                  {m.jenis === 'belajar' ? (
                    <AcademicCapIcon className="size-4" />
                  ) : (
                    <MapPinIcon className="size-4" />
                  )}
                  {m.jenis} · {labelKategori(m.kategori)}
                </div>
                <h2 className="mt-2 font-semibold text-neutral-900 dark:text-neutral-100">{m.judul}</h2>
                <p className="mt-1 text-sm text-neutral-500">{m.poin} poin</p>
                {m.jenis === 'aksi' && !bisaAksi(m) && (
                  <p className="mt-2 text-xs text-amber-700">Selesaikan misi belajar dulu</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {pilih && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
            <h2 className="text-xl font-bold">{pilih.judul}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {pilih.jenis === 'belajar' ? 'Micro-lesson' : 'Aksi lapangan'} ·{' '}
              {labelKategori(pilih.kategori)}
            </p>

            {pilih.deskripsi && (
              <p className="mt-4 text-sm text-neutral-700 dark:text-neutral-300">{pilih.deskripsi}</p>
            )}

            {pilih.jenis === 'belajar' && pilih.micro_lesson && (
              <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm dark:bg-emerald-950/40">
                <p className="font-medium text-emerald-900 dark:text-emerald-100">Kode etik</p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-emerald-800 dark:text-emerald-200">
                  {JSON.stringify(pilih.micro_lesson, null, 2)}
                </pre>
              </div>
            )}

            {pilih.jenis === 'aksi' && !bisaAksi(pilih) && (
              <p className="mt-4 text-sm text-amber-700">
                Selesaikan misi belajar kategori {labelKategori(pilih.kategori)} terlebih dahulu.
              </p>
            )}

            {pilih.jenis === 'aksi' &&
              bisaAksi(pilih) &&
              (pilih.syarat_verifikasi?.metode as string) === 'qr_checkin' && (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium">
                    <QrCodeIcon className="mr-1 inline size-4" />
                    Token QR stasiun
                    <input
                      value={qrToken}
                      onChange={(e) => setQrToken(e.target.value)}
                      placeholder="STN-…"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                    />
                  </label>
                  <p className="text-xs text-neutral-500">
                    Lokasi GPS akan diambil otomatis untuk cek geofence.
                  </p>
                </div>
              )}

            {Boolean((pilih.syarat_verifikasi?.bukti as Record<string, unknown>)?.foto) && (
              <label className="mt-4 block text-sm font-medium">
                Foto bukti
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm"
                />
              </label>
            )}

            {galat && <p className="mt-4 text-sm text-red-600">{galat}</p>}
            {sukses && <p className="mt-4 text-sm text-emerald-700">{sukses}</p>}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPilih(null)}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={proses || (pilih.jenis === 'aksi' && !bisaAksi(pilih))}
                onClick={() => void selesaikan()}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <CheckBadgeIcon className="size-4" />
                {proses ? 'Memproses…' : pilih.jenis === 'belajar' ? 'Tandai selesai' : 'Selesaikan misi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}