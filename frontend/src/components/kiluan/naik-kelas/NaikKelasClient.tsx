'use client'

import KartuAksiCard from '@/components/kiluan/naik-kelas/KartuAksiCard'
import PengajuanKartuForm from '@/components/kiluan/naik-kelas/PengajuanKartuForm'
import ProgresTingkatPanel from '@/components/kiluan/naik-kelas/ProgresTingkatPanel'
import BadgeStatusPengajuan from '@/components/kiluan/naik-kelas/BadgeStatusPengajuan'
import { Link } from '@/i18n/navigation'
import { getKartuAksi, getPengajuanSaya, getSertifikasi } from '@/lib/api/naik-kelas'
import { getUmkmKelola } from '@/lib/api/pasar'
import type { KartuAksiItem, PengajuanKartuItem, SertifikasiItem } from '@/lib/api/types'
import { kartuTervalidasiSet, mapPengajuanPerKartu } from '@/lib/kiluan/naik-kelas'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

export default function NaikKelasClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('naikKelas')
  const [kartu, setKartu] = useState<KartuAksiItem[]>([])
  const [pengajuan, setPengajuan] = useState<PengajuanKartuItem[]>([])
  const [sertifikasi, setSertifikasi] = useState<SertifikasiItem | null>(null)
  const [subjekId, setSubjekId] = useState<string | null>(null)
  const [kartuAktif, setKartuAktif] = useState<KartuAksiItem | null>(null)
  const [revisi, setRevisi] = useState<PengajuanKartuItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
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
      } else {
        setSubjekId(null)
        setSertifikasi(null)
      }
    } catch {
      setGalat(t('errors.load'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, t])

  useEffect(() => {
    void muat()
  }, [muat])

  const pengajuanMap = useMemo(() => mapPengajuanPerKartu(pengajuan), [pengajuan])
  const tervalidasi = useMemo(() => kartuTervalidasiSet(sertifikasi), [sertifikasi])

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-800 via-primary-700 to-teal-800 text-white dark:border-neutral-800">
        <div className="container py-10 sm:py-12">
          <Link
            href={`/${desaSlug}/dasbor`}
            className="inline-flex items-center gap-2 text-sm text-primary-100 hover:text-white"
          >
            <ArrowLeftIcon className="size-4" /> {t('backDashboard')}
          </Link>
          <h1 className="mt-4 text-3xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-sm text-primary-100/90">{desaNama}</p>
        </div>
      </div>

      <div className="container space-y-10 py-8 sm:py-10">
        {loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
        ) : galat ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
        ) : !subjekId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm text-amber-900 dark:text-amber-100">{t('errors.noSubjek')}</p>
            <Link href={`/${desaSlug}/saya/umkm/daftar`} className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
              {t('errors.daftarUmkm')}
            </Link>
          </div>
        ) : (
          <>
            <ProgresTingkatPanel sertifikasi={sertifikasi} kartu={kartu} />

            <section>
              <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t('kartuAksi.title')}</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t('kartuAksi.subtitle')}</p>
              <ul className="mt-6 space-y-4">
                {kartu.map((k) => (
                  <li key={k.id}>
                    <KartuAksiCard
                      kartu={k}
                      pengajuan={pengajuanMap.get(k.id)}
                      tervalidasi={tervalidasi.has(k.id)}
                      onAjukan={() => {
                        setKartuAktif(k)
                        setRevisi(null)
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>

            {(kartuAktif || revisi) && (
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
            )}

            <section>
              <h2 className="text-lg font-semibold text-primary-800 dark:text-primary-100">{t('pengajuan.title')}</h2>
              {pengajuan.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{t('pengajuan.empty')}</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {pengajuan.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
                    >
                      <div>
                        <p className="font-medium text-primary-800 dark:text-primary-100">{p.kartu.nama}</p>
                        {p.catatan && (p.status === 'revisi' || p.status === 'ditolak') && (
                          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                            {t('pengajuan.catatan', { catatan: p.catatan })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <BadgeStatusPengajuan status={p.status} />
                        {p.status === 'revisi' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRevisi(p)
                              setKartuAktif(null)
                            }}
                            className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                          >
                            {t('pengajuan.perbaiki')}
                          </button>
                        )}
                      </div>
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
