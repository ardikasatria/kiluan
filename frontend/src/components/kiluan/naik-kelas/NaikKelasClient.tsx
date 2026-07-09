'use client'

import PengajuanKartuForm from '@/components/kiluan/naik-kelas/PengajuanKartuForm'
import { SertifikasiBadge } from '@/components/kiluan/pasar/ProdukCard'
import { getKartuAksi, getPengajuanSaya, getSertifikasi } from '@/lib/api/naik-kelas'
import { getUmkmKelola } from '@/lib/api/pasar'
import type { KartuAksiItem, PengajuanKartuItem, SertifikasiItem } from '@/lib/api/types'
import {
  labelBuktiDibutuhkan,
  labelStatusPengajuan,
  warnaStatusPengajuan,
} from '@/lib/kiluan/naik-kelas'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function NaikKelasClient({ desaSlug, desaNama }: Props) {
  const [kartu, setKartu] = useState<KartuAksiItem[]>([])
  const [pengajuan, setPengajuan] = useState<PengajuanKartuItem[]>([])
  const [sertifikasi, setSertifikasi] = useState<SertifikasiItem | null>(null)
  const [subjekId, setSubjekId] = useState<string | null>(null)
  const [kartuAktif, setKartuAktif] = useState<KartuAksiItem | null>(null)
  const [revisi, setRevisi] = useState<PengajuanKartuItem | null>(null)
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [k, p, umkmSaya] = await Promise.all([
        getKartuAksi(desaSlug),
        getPengajuanSaya(desaSlug),
        getUmkmKelola(desaSlug).catch(() => ({ item: [] })),
      ])
      setKartu(k.item)
      setPengajuan(p.item)
      const umkm = umkmSaya.item[0]
      if (umkm) {
        setSubjekId(umkm.id)
        const s = await getSertifikasi(desaSlug, 'umkm', umkm.id)
        setSertifikasi(s)
      }
    } finally {
      setLoading(false)
    }
  }, [desaSlug])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-800 via-primary-700 to-kiluan-teal text-white">
        <div className="container py-10 sm:py-12">
          <Link href={`/${desaSlug}/dasbor`} className="inline-flex items-center gap-2 text-sm text-primary-100 hover:text-white">
            <ArrowLeftIcon className="size-4" /> Dasbor
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Naik Kelas Lestari</h1>
          <p className="mt-2 text-sm text-primary-100/90">{desaNama}</p>
          {sertifikasi?.tingkat && (
            <div className="mt-4">
              <SertifikasiBadge tingkat={sertifikasi.tingkat} />
              <p className="mt-1 text-xs text-primary-100/80">Skor {sertifikasi.skor} poin praktik</p>
            </div>
          )}
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        {loading ? (
          <p className="text-sm text-neutral-500">Memuat katalog…</p>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">Kartu aksi</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Pelajari dulu, lalu ajukan bukti praktik regeneratif Anda.
              </p>
              <ul className="mt-6 space-y-4">
                {kartu.map((k) => (
                  <li key={k.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-primary-800 dark:text-primary-100">{k.nama}</h3>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{k.deskripsi}</p>
                        {k.kenapa_penting && (
                          <p className="mt-3 rounded-lg bg-primary-50 p-3 text-sm text-primary-900 dark:bg-primary-900/30 dark:text-primary-100">
                            <span className="font-medium">Kenapa penting: </span>
                            {k.kenapa_penting}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-neutral-500">
                          Bobot {k.bobot} · {labelBuktiDibutuhkan(k.bukti_dibutuhkan).join(', ')}
                        </p>
                      </div>
                      {subjekId && (
                        <button
                          type="button"
                          onClick={() => {
                            setKartuAktif(k)
                            setRevisi(null)
                          }}
                          className="shrink-0 rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white"
                        >
                          Ajukan
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {(kartuAktif || revisi) && subjekId && (
              <div className="mt-8">
                <PengajuanKartuForm
                  desaSlug={desaSlug}
                  kartu={kartuAktif ?? kartu.find((k) => k.id === revisi?.kartu.id)!}
                  subjekTipe="umkm"
                  subjekId={subjekId}
                  pengajuanRevisi={revisi}
                  onBerhasil={() => {
                    setKartuAktif(null)
                    setRevisi(null)
                    void muat()
                  }}
                  onBatal={() => {
                    setKartuAktif(null)
                    setRevisi(null)
                  }}
                />
              </div>
            )}

            <section className="mt-10">
              <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">Pengajuan saya</h2>
              {pengajuan.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">Belum ada pengajuan.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {pengajuan.map((p) => (
                    <li key={p.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-primary-800 dark:text-primary-100">{p.kartu.nama}</p>
                        <span className={clsx('rounded-full px-2 py-0.5 text-xs ring-1', warnaStatusPengajuan(p.status))}>
                          {labelStatusPengajuan(p.status)}
                        </span>
                      </div>
                      {p.catatan && (
                        <p className="mt-2 text-sm text-neutral-600">Catatan validator: {p.catatan}</p>
                      )}
                      {p.status === 'revisi' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRevisi(p)
                            setKartuAktif(null)
                          }}
                          className="mt-2 text-sm font-medium text-primary-600 hover:underline"
                        >
                          Perbaiki & kirim ulang →
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
