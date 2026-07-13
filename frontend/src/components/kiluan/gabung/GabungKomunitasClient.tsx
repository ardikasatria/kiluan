'use client'

import DesaCard from '@/components/kiluan/DesaCard'
import GabungStepper from '@/components/kiluan/gabung/GabungStepper'
import SigercivPetaPemilih, { type MarkerPeta } from '@/components/kiluan/peta/SigercivPetaPemilih'
import { useAuth } from '@/contexts/AuthProvider'
import { DEFAULT_DESA_SLUG } from '@/contexts/DesaKonteksProvider'
import { daftarDesaDiscovery } from '@/lib/api/discovery'
import { getProfilDesa } from '@/lib/api/desa'
import { kodeGalat } from '@/lib/api/galat'
import { usePesanGalat } from '@/hooks/usePesanGalat'
import { ajukanKeanggotaan } from '@/lib/api/keanggotaan'
import type { PeranRef } from '@/lib/api/referensi'
import type { DesaRingkas, ProfilDesa } from '@/lib/api/types'
import {
  indeksLangkah,
  langkahGabung,
  memerlukanPilihDesa,
  PERAN_GABUNG,
  peranGabungValid,
  type HasilGabung,
  type LangkahGabung,
  type PeranGabung,
} from '@/lib/kiluan/gabung'
import { PUSAT_LAMPUNG } from '@/lib/kiluan/jelajah-params'
import { labelPeran, punyaPeran, statusKeanggotaan, type PeranKode } from '@/lib/kiluan/peran'
import { RUTE_GABUNG, RUTE_WISATAWAN } from '@/lib/kiluan/rute-sigerciv'
import { Button } from '@/shared/Button'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  MapIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'

interface Props {
  peranRef: PeranRef[]
  peranAwal?: string
  desaAwal?: string
}

const IKON_PERAN: Record<PeranGabung, typeof GlobeAltIcon> = {
  wisatawan: GlobeAltIcon,
  umkm: BuildingStorefrontIcon,
  agen: MapIcon,
  kontributor: UsersIcon,
}

export default function GabungKomunitasClient({ peranRef, peranAwal, desaAwal }: Props) {
  const { user, refreshProfil } = useAuth()
  const t = useTranslations('gabung')
  const tPeran = useTranslations('peran')
  const tInfo = useTranslations('dasbor.peranInfo')
  const pesanGalat = usePesanGalat()

  const [langkah, setLangkah] = useState<LangkahGabung>('peran')
  const [peran, setPeran] = useState<PeranKode | null>(() => peranGabungValid(peranAwal))
  const [desaSlug, setDesaSlug] = useState<string | null>(null)
  const [desaProfil, setDesaProfil] = useState<ProfilDesa | null>(null)
  const [desa, setDesa] = useState<DesaRingkas[]>([])
  const [qInput, setQInput] = useState('')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [mengirim, setMengirim] = useState(false)
  const [hasil, setHasil] = useState<HasilGabung | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const peranMap = useMemo(() => new Map(peranRef.map((p) => [p.kode, p])), [peranRef])

  const muatDesa = useCallback((q?: string) => {
    startTransition(async () => {
      const res = await daftarDesaDiscovery({ q: q?.trim() || undefined, batas: 24 })
      setDesa(res.item)
    })
  }, [])

  const pilihPeran = (kode: PeranKode) => {
    setPeran(kode)
    setGalat(null)
    setHasil(null)
    setDesaSlug(null)
    setDesaProfil(null)
    if (memerlukanPilihDesa(kode)) {
      setLangkah('desa')
      if (desa.length === 0) muatDesa()
    } else {
      setLangkah('konfirmasi')
    }
  }

  const pilihDesa = async (slug: string) => {
    setDesaSlug(slug)
    setHighlightedId(slug)
    setGalat(null)
    const profil = await getProfilDesa(slug)
    setDesaProfil(profil)
  }

  useEffect(() => {
    const kode = peranGabungValid(peranAwal)
    if (!kode || kode === 'wisatawan') return

    setPeran(kode)
    if (desaAwal) {
      void (async () => {
        await pilihDesa(desaAwal)
        setLangkah('konfirmasi')
      })()
      return
    }
    setLangkah('desa')
    if (desa.length === 0) muatDesa()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inisialisasi dari query URL sekali
  }, [peranAwal, desaAwal])

  const lanjutKeKonfirmasi = () => {
    if (!desaSlug) return
    setLangkah('konfirmasi')
  }

  const kembali = () => {
    setGalat(null)
    if (langkah === 'konfirmasi') {
      setLangkah(peran && memerlukanPilihDesa(peran) ? 'desa' : 'peran')
      return
    }
    if (langkah === 'desa') {
      setLangkah('peran')
      return
    }
    if (langkah === 'hasil') {
      setLangkah('peran')
      setPeran(null)
      setDesaSlug(null)
      setDesaProfil(null)
      setHasil(null)
    }
  }

  const kirimAjuan = async () => {
    if (!peran || !user) return
    setGalat(null)
    setMengirim(true)

    try {
      if (peran === 'wisatawan') {
        if (punyaPeran(user.profil, 'wisatawan')) {
          setHasil('sudah_aktif')
          setLangkah('hasil')
          return
        }
        await ajukanKeanggotaan(DEFAULT_DESA_SLUG, peran)
        await refreshProfil()
        setHasil('aktif')
        setLangkah('hasil')
        return
      }

      if (!desaSlug) return
      const res = await ajukanKeanggotaan(desaSlug, peran)
      await refreshProfil()
      setHasil(res.status === 'aktif' ? 'aktif' : 'menunggu')
      setLangkah('hasil')
    } catch (err) {
      if (kodeGalat(err) === 'konflik') {
        setHasil('konflik')
        setLangkah('hasil')
        return
      }
      setGalat(pesanGalat(err))
    } finally {
      setMengirim(false)
    }
  }

  const markers: MarkerPeta[] = useMemo(
    () =>
      desa
        .filter((d) => d.lokasi)
        .map((d) => ({
          id: d.slug,
          nama: d.nama,
          lokasi: d.lokasi!,
          tipe: 'desa' as const,
          sublabel: d.deskripsi ?? undefined,
        })),
    [desa],
  )

  const statusPeran = peran ? statusKeanggotaan(user?.profil ?? null, peran) : null
  const urutan = langkahGabung(peran)
  const progress = ((indeksLangkah(peran, langkah) + 1) / urutan.length) * 100

  return (
    <div>
      <section className="mb-8 overflow-hidden rounded-2xl border border-primary-700/25 bg-gradient-to-br from-primary-800 via-primary-700 to-kiluan-teal px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10 dark:border-primary-800/50 dark:from-primary-950 dark:via-primary-900 dark:to-primary-800">
        <p className="text-sm font-medium text-primary-100/90">Sigerciv</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('hero.title')}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-primary-100/90">{t('hero.subtitle')}</p>
        <div
          className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('hero.progress')}
        >
          <div className="h-full rounded-full bg-kiluan-mint transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <GabungStepper peran={peran} langkah={langkah} />

      {galat ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          {galat}
        </div>
      ) : null}

      {langkah === 'peran' && (
        <section aria-labelledby="gabung-pilih-peran">
          <h2 id="gabung-pilih-peran" className="text-xl font-semibold text-primary-800 dark:text-primary-100">
            {t('peran.title')}
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('peran.desc')}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PERAN_GABUNG.map((kode) => {
              const ref = peranMap.get(kode)
              const Icon = IKON_PERAN[kode as PeranGabung]
              const dipilih = peran === kode
              const scoped = ref?.scoped_desa ?? memerlukanPilihDesa(kode)
              const status = statusKeanggotaan(user?.profil ?? null, kode)
              return (
                <button
                  key={kode}
                  type="button"
                  onClick={() => pilihPeran(kode)}
                  className={clsx(
                    'group rounded-2xl border p-5 text-start transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none sm:p-6',
                    dipilih
                      ? 'border-primary-500 bg-primary-50 shadow-sm dark:border-primary-500 dark:bg-primary-950/40'
                      : 'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-primary-600',
                  )}
                  aria-pressed={dipilih}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-700 text-white dark:bg-primary-600">
                      <Icon className="size-6" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {labelPeran(kode, tPeran)}
                        </h3>
                        <span
                          className={clsx(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            scoped
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
                          )}
                        >
                          {scoped ? t('peran.badgeMenunggu') : t('peran.badgeAktif')}
                        </span>
                        {status === 'menunggu' ? (
                          <span className="text-xs text-amber-700 dark:text-amber-300">{t('peran.sudahMenunggu')}</span>
                        ) : null}
                        {status === 'revisi' || status === 'ditolak' ? (
                          <span className="text-xs text-red-700 dark:text-red-300">{t('peran.perluRevisi')}</span>
                        ) : null}
                        {status === 'aktif' ? (
                          <span className="text-xs text-emerald-700 dark:text-emerald-300">{t('peran.sudahAktif')}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">{tInfo(`${kode}.tagline`)}</p>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                        {tInfo(`${kode}.deskripsi`)}
                      </p>
                      <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {scoped ? t('peran.hintScoped') : t('peran.hintGlobal')}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {langkah === 'desa' && peran && (
        <section aria-labelledby="gabung-pilih-desa">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={kembali}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
            >
              <ArrowLeftIcon className="size-4" aria-hidden />
              {t('nav.kembali')}
            </button>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('desa.peranTerpilih', { peran: labelPeran(peran, tPeran) })}
            </span>
          </div>
          <h2 id="gabung-pilih-desa" className="text-xl font-semibold text-primary-800 dark:text-primary-100">
            {t('desa.title')}
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('desa.desc')}</p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <input
                type="search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') muatDesa(qInput)
                }}
                placeholder={t('desa.cari')}
                className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pr-4 pl-10 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                aria-label={t('desa.cari')}
              />
            </div>
            <Button outline onClick={() => muatDesa(qInput)} disabled={pending}>
              {pending ? t('desa.memuat') : t('desa.cariTombol')}
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="min-h-[300px] lg:min-h-[420px]">
              <SigercivPetaPemilih
                markers={markers}
                center={PUSAT_LAMPUNG}
                zoom={8}
                highlightedId={highlightedId}
                emptyLabel={t('desa.petaKosong')}
                onMarkerClick={(id) => void pilihDesa(id)}
                onMarkerHover={setHighlightedId}
                className="h-full min-h-[300px]"
              />
            </div>
            <div>
              <ul className="grid max-h-[420px] gap-3 overflow-y-auto sm:grid-cols-1">
                {desa.map((d) => (
                  <li key={d.slug}>
                    <DesaCard
                      desa={d}
                      onPilih={() => {
                        void pilihDesa(d.slug)
                      }}
                    />
                  </li>
                ))}
              </ul>
              {desa.length === 0 && !pending ? (
                <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
                  {t('desa.kosong')}
                </p>
              ) : null}
            </div>
          </div>

          {desaProfil && desaSlug ? (
            <div className="mt-6 rounded-2xl border border-primary-200 bg-primary-50/60 p-5 dark:border-primary-800 dark:bg-primary-950/30">
              <p className="text-xs font-semibold tracking-wide text-primary-600 uppercase dark:text-primary-400">
                {t('desa.terpilih')}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-primary-900 dark:text-primary-100">{desaProfil.nama}</h3>
              {desaProfil.deskripsi ? (
                <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{desaProfil.deskripsi}</p>
              ) : null}
              <Button color="primary" className="mt-4" onClick={lanjutKeKonfirmasi}>
                {t('desa.lanjut')}
                <ArrowRightIcon className="size-4" aria-hidden />
              </Button>
            </div>
          ) : null}
        </section>
      )}

      {langkah === 'konfirmasi' && peran && (
        <section aria-labelledby="gabung-konfirmasi">
          <div className="mb-4">
            <button
              type="button"
              onClick={kembali}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
            >
              <ArrowLeftIcon className="size-4" aria-hidden />
              {t('nav.kembali')}
            </button>
          </div>
          <h2 id="gabung-konfirmasi" className="text-xl font-semibold text-primary-800 dark:text-primary-100">
            {t('konfirmasi.title')}
          </h2>
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800/60">
            <dl className="space-y-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-neutral-500 dark:text-neutral-400">{t('konfirmasi.peran')}</dt>
                <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{labelPeran(peran, tPeran)}</dd>
              </div>
              {memerlukanPilihDesa(peran) ? (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">{t('konfirmasi.desa')}</dt>
                  <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {desaProfil?.nama ?? desaSlug}
                  </dd>
                </div>
              ) : (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">{t('konfirmasi.cakupan')}</dt>
                  <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{t('konfirmasi.lintasDesa')}</dd>
                </div>
              )}
            </dl>
            <p className="mt-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {memerlukanPilihDesa(peran) ? t('konfirmasi.hintMenunggu') : t('konfirmasi.hintAktif')}
            </p>
            {statusPeran === 'ditolak' || statusPeran === 'revisi' ? (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
                {t('konfirmasi.ditolakPeringatan')}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button color="primary" onClick={() => void kirimAjuan()} disabled={mengirim}>
                {mengirim ? t('konfirmasi.mengirim') : t('konfirmasi.ajukan')}
              </Button>
            </div>
          </div>
        </section>
      )}

      {langkah === 'hasil' && hasil && peran && (
        <section aria-labelledby="gabung-hasil" className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-700 dark:bg-neutral-800/60">
          <div className="flex gap-4">
            {hasil === 'konflik' ? (
              <ExclamationTriangleIcon className="size-10 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            ) : (
              <CheckCircleIcon className="size-10 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            )}
            <div>
              <h2 id="gabung-hasil" className="text-xl font-semibold text-primary-800 dark:text-primary-100">
                {t(`hasil.${hasil}.title`)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {t(`hasil.${hasil}.desc`, {
                  peran: labelPeran(peran, tPeran),
                  desa: desaProfil?.nama ?? desaSlug ?? '',
                })}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {hasil === 'aktif' || hasil === 'sudah_aktif' ? (
                  <Button color="primary" href={RUTE_WISATAWAN.discovery}>
                    {t('hasil.aktif.cta')}
                  </Button>
                ) : null}
                {hasil === 'menunggu' || hasil === 'konflik' ? (
                  <Button color="primary" href={`${RUTE_WISATAWAN.akun}#keanggotaan`}>
                    {t('hasil.menunggu.cta')}
                  </Button>
                ) : null}
                {hasil === 'konflik' ? (
                  <Button outline href={RUTE_GABUNG}>
                    {t('hasil.konflik.ctaBaru')}
                  </Button>
                ) : null}
                <Button plain onClick={kembali}>
                  {t('hasil.ajukanLain')}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
