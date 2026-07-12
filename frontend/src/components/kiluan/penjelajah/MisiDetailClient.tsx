'use client'

import MicroLessonView from '@/components/kiluan/penjelajah/MicroLessonView'
import PemindaiQR from '@/components/kiluan/penjelajah/PemindaiQR'
import { Link } from '@/i18n/navigation'
import { kodeGalat, pesanGalat } from '@/lib/api/galat'
import {
  ambilLokasi,
  getMisi,
  getMisiDetail,
  getPasporSaya,
  getStasiun,
  selesaiMisi,
  unggahBuktiFoto,
} from '@/lib/api/penjelajah'
import type { MisiDetail, MisiSelesaiPayload, StasiunLestariDto } from '@/lib/api/types'
import {
  butuhFotoBukti,
  jarakMeter,
  kategoriBelajarTerverifikasi,
  metodeVerifikasi,
  misiAksiTerkunci,
  teksDampakTemplate,
} from '@/lib/kiluan/penjelajah'
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  LockClosedIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

const StasiunPeta = dynamic(() => import('@/components/kiluan/penjelajah/StasiunPetaClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-600">
      …
    </div>
  ),
})

interface Props {
  desaSlug: string
  desaNama: string
  misiId: string
}

export default function MisiDetailClient({ desaSlug, desaNama, misiId }: Props) {
  const t = useTranslations('misi')
  const locale = useLocale()
  const [misi, setMisi] = useState<MisiDetail | null>(null)
  const [stasiun, setStasiun] = useState<StasiunLestariDto | null>(null)
  const [katUnlock, setKatUnlock] = useState<Set<string>>(new Set())
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [geoGalat, setGeoGalat] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrToken, setQrToken] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [proses, setProses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  function labelKategori(k: string) {
    if (k === 'mangrove') return t('kategori.mangrove')
    if (k === 'karang') return t('kategori.karang')
    if (k === 'sampah') return t('kategori.sampah')
    if (k === 'lumba') return t('kategori.lumba')
    if (k === 'budaya') return t('kategori.budaya')
    return k
  }

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const [{ misi: d }, belajarRes, stasiunRes] = await Promise.all([
        getMisiDetail(desaSlug, misiId),
        getMisi(desaSlug, { jenis: 'belajar' }),
        getStasiun(desaSlug),
      ])
      setMisi(d)
      const belajarMap = new Map(belajarRes.item.map((m) => [m.id, m]))
      try {
        const paspor = await getPasporSaya(desaSlug)
        setKatUnlock(kategoriBelajarTerverifikasi(paspor, belajarMap))
      } catch {
        setKatUnlock(new Set())
      }
      if (d.stasiun?.id) {
        const st = stasiunRes.item.find((s) => s.id === d.stasiun!.id) ?? null
        setStasiun(st)
      } else {
        setStasiun(null)
      }
    } catch {
      setGalat(t('errors.load'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, misiId, t])

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    if (!stasiun?.lokasi) return
    ambilLokasi()
      .then((loc) => {
        setUserLoc(loc)
        setGeoGalat(null)
      })
      .catch(() => setGeoGalat(t('errors.lokasiRequired')))
  }, [stasiun?.lokasi, t])

  const terkunci = misi ? misiAksiTerkunci(misi, katUnlock) : false
  const metode = misi ? metodeVerifikasi(misi.syarat_verifikasi) : 'otomatis'
  const butuhFoto = misi ? butuhFotoBukti(misi.syarat_verifikasi) : false

  const jarak = useMemo(() => {
    if (!userLoc || !stasiun?.lokasi) return null
    return jarakMeter(userLoc, stasiun.lokasi)
  }, [userLoc, stasiun?.lokasi])

  async function selesaikan() {
    if (!misi) return
    setProses(true)
    setGalat(null)
    setSukses(null)
    try {
      const bukti: MisiSelesaiPayload['bukti'] = {}

      if (metode === 'qr_checkin') {
        if (!qrToken.trim()) {
          setGalat(t('errors.qrRequired'))
          return
        }
        bukti.qr_token = qrToken.trim()
        try {
          bukti.lokasi = await ambilLokasi()
        } catch {
          setGalat(t('errors.lokasiRequired'))
          return
        }
      }

      if (metode === 'foto_geotag' || butuhFoto) {
        if (!foto) {
          setGalat(t('errors.fotoRequired'))
          return
        }
        bukti.foto_media_id = await unggahBuktiFoto(desaSlug, foto)
        if (metode === 'foto_geotag') {
          try {
            bukti.lokasi = await ambilLokasi()
          } catch {
            setGalat(t('errors.lokasiRequired'))
            return
          }
        }
      }

      const res = await selesaiMisi(desaSlug, misi.id, {
        bukti,
        dampak: teksDampakTemplate(misi.dampak_template as Record<string, unknown>),
      })

      if (res.stempel.status === 'terverifikasi') {
        setSukses(t('sukses.terverifikasi'))
      } else {
        setSukses(t('sukses.menunggu'))
      }
      await muat()
    } catch (err) {
      const kode = kodeGalat(err)
      if (kode === 'di_luar_geofence' && stasiun) {
        setGalat(t('errors.diLuarGeofence', { stasiun: stasiun.nama, radius: stasiun.radius_m }))
      } else if (kode === 'bukti_kurang') {
        setGalat(t('errors.buktiKurang'))
      } else {
        setGalat(pesanGalat(err, locale as 'id' | 'en') || t('errors.gagal'))
      }
    } finally {
      setProses(false)
    }
  }

  if (loading) {
    return <p className="container py-10 text-sm text-neutral-500">{t('loading')}</p>
  }

  if (!misi) {
    return (
      <div className="container py-10">
        <p className="text-sm text-red-600">{galat ?? t('errors.load')}</p>
        <Link href={`/${desaSlug}/misi`} className="mt-4 inline-block text-sm text-primary-600 hover:underline">
          {t('detail.back')}
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-8">
          <Link
            href={`/${desaSlug}/misi`}
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            <ArrowLeftIcon className="size-4" />
            {t('detail.back')}
          </Link>
          <p className="mt-4 text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <h1 className="mt-1 text-2xl font-bold text-primary-800 dark:text-primary-100 sm:text-3xl">{misi.judul}</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {t(`jenis.${misi.jenis}`)} · {labelKategori(misi.kategori)} · {t('poin', { count: misi.poin })}
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {misi.deskripsi && (
              <p className="text-neutral-700 dark:text-neutral-300">{misi.deskripsi}</p>
            )}

            {misi.jenis === 'belajar' && misi.micro_lesson && (
              <MicroLessonView
                lesson={misi.micro_lesson}
                disabled={proses}
                onConfirm={() => void selesaikan()}
              />
            )}

            {misi.jenis === 'aksi' && terkunci && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <LockClosedIcon className="size-6 shrink-0 text-amber-700 dark:text-amber-400" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">{t('belajarDulu')}</p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                    {t('belajarDuluKategori', { kategori: labelKategori(misi.kategori) })}
                  </p>
                </div>
              </div>
            )}

            {misi.jenis === 'aksi' && !terkunci && (
              <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('detail.completeTitle')}</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t(`detail.metode.${metode}` as 'detail.metode.qr_checkin')}
                </p>

                {metode === 'qr_checkin' && (
                  <PemindaiQR value={qrToken} onChange={setQrToken} />
                )}

                {(butuhFoto || metode === 'foto_geotag') && (
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t('modal.fotoBukti')}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                      className="mt-1 block w-full text-sm"
                    />
                  </label>
                )}

                {metode === 'konfirmasi_pemandu' && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                    {t('detail.pemanduHint')}
                  </p>
                )}

                {galat && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
                    {galat}
                  </p>
                )}
                {sukses && (
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                    {sukses}
                  </p>
                )}

                <button
                  type="button"
                  disabled={proses}
                  onClick={() => void selesaikan()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <CheckBadgeIcon className="size-5" />
                  {proses ? t('modal.memproses') : t('modal.selesaikan')}
                </button>
              </div>
            )}

            {misi.jenis === 'belajar' && (galat || sukses) && (
              <div className="space-y-2">
                {galat && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
                    {galat}
                  </p>
                )}
                {sukses && (
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                    {sukses}
                  </p>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('detail.syaratTitle')}</h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                {t(`detail.metode.${metode}` as 'detail.metode.qr_checkin')}
              </p>
              {butuhFoto && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('detail.fotoWajib')}</p>
              )}
            </div>

            {stasiun && (
              <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
                <div className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                  <MapPinIcon className="size-5 text-primary-500" />
                  {stasiun.nama}
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {t('detail.radius', { radius: stasiun.radius_m })}
                </p>
                {jarak != null && (
                  <p className="mt-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                    {t('detail.jarak', { jarak })}
                  </p>
                )}
                {geoGalat && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{geoGalat}</p>
                )}
                {stasiun.lokasi && (
                  <StasiunPeta
                    stasiun={stasiun.lokasi}
                    nama={stasiun.nama}
                    radiusM={stasiun.radius_m}
                    userLoc={userLoc}
                    className="mt-3"
                  />
                )}
              </div>
            )}

            {Object.keys(misi.dampak_template ?? {}).length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{t('detail.rewardTitle')}</h3>
                <ul className="mt-2 space-y-1 text-sm text-emerald-800 dark:text-emerald-200">
                  {Object.entries(misi.dampak_template as Record<string, unknown>).map(([k, v]) => (
                    <li key={k}>
                      {k}: {String(v)}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{t('detail.rewardNote')}</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
