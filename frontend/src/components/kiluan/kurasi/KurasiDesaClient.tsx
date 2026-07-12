'use client'

import AntreanKurasi from '@/components/kiluan/kurasi/AntreanKurasi'
import BadgeStatusKontribusi from '@/components/kiluan/kurasi/BadgeStatusKontribusi'
import KontribusiMuatanKurasi, {
  BannerBelumDiterapkan,
  MetaKontribusi,
} from '@/components/kiluan/kurasi/KontribusiMuatanKurasi'
import PanelKeputusan, { type AksiKurator } from '@/components/kiluan/kurasi/PanelKeputusan'
import BadgeStatusPaket from '@/components/kiluan/pasar/BadgeStatusPaket'
import { urlSampulDariMedia } from '@/lib/api/media'
import { getAntreanKurasi, transisiKontribusi } from '@/lib/api/kontribusi'
import { pesanGalat } from '@/lib/api/galat'
import { getDaftarPaket, getKurasiLog, getPaketDetail, transisiPaket } from '@/lib/api/pasar'
import type { KontribusiItem, KurasiLogItem, PaketDetail, PaketRingkas } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import {
  labelTargetKontribusi,
  labelTipeKontribusi,
  perluTombolTerapkan,
  ringkasanMuatan,
} from '@/lib/kiluan/kontribusi'
import { kelompokItineraryPerHari, labelItemItinerary } from '@/lib/kiluan/paket'
import { formatTanggal } from '@/lib/kiluan/lencana'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

type TabUtama = 'kontribusi' | 'paket' | 'log'
type SubKontribusi = 'menunggu' | 'belumDiterapkan'

const TIPE_FILTER = ['foto', 'tips', 'koreksi_data', 'spot_baru', 'ulasan'] as const
const TARGET_FILTER = ['destinasi', 'layanan', 'umkm', 'paket_wisata', 'desa'] as const

interface Props {
  desaSlug: string
  tabAwal?: TabUtama
}

export default function KurasiDesaClient({ desaSlug, tabAwal = 'kontribusi' }: Props) {
  const locale = useLocale()
  const localeTag = locale === 'en' ? 'en-US' : 'id-ID'
  const t = useTranslations('kelola.kurasi')
  const tKontrib = useTranslations('kontribusi')
  const trK = tKontrib as unknown as (key: string) => string

  const [tab, setTab] = useState<TabUtama>(tabAwal)
  const [subKontrib, setSubKontrib] = useState<SubKontribusi>('menunggu')
  const [filterTipe, setFilterTipe] = useState('')
  const [filterTarget, setFilterTarget] = useState('')
  const [filterLogEntitas, setFilterLogEntitas] = useState('')

  const [kontribusi, setKontribusi] = useState<KontribusiItem[]>([])
  const [pilihKontrib, setPilihKontrib] = useState<KontribusiItem | null>(null)
  const [kursorKontrib, setKursorKontrib] = useState<string | null>(null)
  const [adaLagiKontrib, setAdaLagiKontrib] = useState(false)

  const [paket, setPaket] = useState<PaketRingkas[]>([])
  const [pilihPaket, setPilihPaket] = useState<PaketDetail | null>(null)
  const [pilihPaketId, setPilihPaketId] = useState<string | null>(null)

  const [log, setLog] = useState<KurasiLogItem[]>([])
  const [kursorLog, setKursorLog] = useState<string | null>(null)
  const [adaLagiLog, setAdaLagiLog] = useState(false)

  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muatKontribusi = useCallback(
    async (append = false) => {
      setLoading(true)
      setGalat(null)
      try {
        const status = subKontrib === 'menunggu' ? 'menunggu' : 'disetujui'
        const res = await getAntreanKurasi(desaSlug, {
          status,
          tipe: filterTipe || undefined,
          target_tipe: filterTarget || undefined,
          kursor: append ? kursorKontrib ?? undefined : undefined,
        })
        let item = res.item
        if (subKontrib === 'belumDiterapkan') {
          item = item.filter((k) => k.tipe === 'koreksi_data' || k.tipe === 'spot_baru')
        }
        setKontribusi((prev) => (append ? [...prev, ...item] : item))
        setKursorKontrib(res.meta.kursor_berikutnya)
        setAdaLagiKontrib(res.meta.ada_lagi)
        if (!append) {
          const first = item[0] ?? null
          setPilihKontrib(first)
        }
      } catch (err) {
        setGalat(pesanGalat(err, locale as 'id' | 'en'))
      } finally {
        setLoading(false)
      }
    },
    [desaSlug, subKontrib, filterTipe, filterTarget, kursorKontrib, locale],
  )

  const muatPaket = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getDaftarPaket(desaSlug, { kelola: true, status: 'review' })
      setPaket(res.item)
      const first = res.item[0]
      if (first) {
        setPilihPaketId(first.id)
        const detail = await getPaketDetail(desaSlug, first.id, true)
        setPilihPaket(detail)
      } else {
        setPilihPaketId(null)
        setPilihPaket(null)
      }
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  const muatLog = useCallback(
    async (append = false) => {
      setLoading(true)
      setGalat(null)
      try {
        const res = await getKurasiLog(desaSlug, {
          entitas_tipe: filterLogEntitas || undefined,
          kursor: append ? kursorLog ?? undefined : undefined,
          batas: 20,
        })
        setLog((prev) => (append ? [...prev, ...res.item] : res.item))
        setKursorLog(res.meta.kursor_berikutnya)
        setAdaLagiLog(res.meta.ada_lagi)
      } catch (err) {
        setGalat(pesanGalat(err, locale as 'id' | 'en'))
      } finally {
        setLoading(false)
      }
    },
    [desaSlug, filterLogEntitas, kursorLog, locale],
  )

  useEffect(() => {
    if (tab === 'kontribusi') void muatKontribusi(false)
    else if (tab === 'paket') void muatPaket()
    else void muatLog(false)
  }, [tab, subKontrib, filterTipe, filterTarget, filterLogEntitas]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pilihPaketById(id: string) {
    setPilihPaketId(id)
    setPilihPaket(null)
    try {
      const d = await getPaketDetail(desaSlug, id, true)
      setPilihPaket(d)
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en'))
    }
  }

  async function keputusanKontrib(aksi: AksiKurator, catatan: string) {
    if (!pilihKontrib) return
    await transisiKontribusi(desaSlug, pilihKontrib.id, aksi, catatan)
    setSukses(t(`sukses.kontribusi.${aksi}`))
    await muatKontribusi(false)
    if (tab === 'log') void muatLog(false)
  }

  async function keputusanPaket(aksi: AksiKurator, catatan: string) {
    if (!pilihPaketId) return
    await transisiPaket(desaSlug, pilihPaketId, aksi, catatan)
    setSukses(t(`sukses.paket.${aksi}`))
    await muatPaket()
    if (tab === 'log') void muatLog(false)
  }

  const itineraryPaket = useMemo(
    () => kelompokItineraryPerHari(pilihPaket?.item ?? []),
    [pilihPaket?.item],
  )

  const sampulPaket = pilihPaket ? urlSampulDariMedia(pilihPaket.media ?? []) : null

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('tabLabel')}>
        {(['kontribusi', 'paket', 'log'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key)
              setSukses(null)
              setGalat(null)
            }}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-medium transition',
              tab === key
                ? 'bg-primary-700 text-white dark:bg-primary-600'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300',
            )}
          >
            {t(`tabs.${key}`)}
            {key === 'kontribusi' && subKontrib === 'menunggu' && kontribusi.length > 0 && tab === 'kontribusi' && (
              <span className="ms-1.5 rounded-full bg-white/20 px-1.5 text-xs">{kontribusi.length}</span>
            )}
            {key === 'paket' && paket.length > 0 && tab === 'paket' && (
              <span className="ms-1.5 rounded-full bg-white/20 px-1.5 text-xs">{paket.length}</span>
            )}
          </button>
        ))}
      </div>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">{sukses}</p>
      )}

      {tab === 'kontribusi' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_1fr]">
          <aside className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['menunggu', 'belumDiterapkan'] as const).map((sk) => (
                <button
                  key={sk}
                  type="button"
                  onClick={() => setSubKontrib(sk)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    subKontrib === sk
                      ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
                  )}
                >
                  {t(`subKontrib.${sk}`)}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={filterTipe}
                onChange={(e) => setFilterTipe(e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                aria-label={t('filterTipe')}
              >
                <option value="">{t('filterSemuaTipe')}</option>
                {TIPE_FILTER.map((tp) => (
                  <option key={tp} value={tp}>{labelTipeKontribusi(tp, trK)}</option>
                ))}
              </select>
              <select
                value={filterTarget}
                onChange={(e) => setFilterTarget(e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                aria-label={t('filterTarget')}
              >
                <option value="">{t('filterSemuaTarget')}</option>
                {TARGET_FILTER.map((tg) => (
                  <option key={tg} value={tg}>{labelTargetKontribusi(tg, trK)}</option>
                ))}
              </select>
            </div>
            <AntreanKurasi
              items={kontribusi}
              selectedId={pilihKontrib?.id ?? null}
              onSelect={(id) => setPilihKontrib(kontribusi.find((k) => k.id === id) ?? null)}
              loading={loading}
              loadingMessage={t('loading')}
              emptyMessage={subKontrib === 'menunggu' ? t('emptyKontribMenunggu') : t('emptyBelumDiterapkan')}
              adaLagi={adaLagiKontrib}
              onLoadMore={() => void muatKontribusi(true)}
              loadMoreLabel={t('loadMore')}
              ariaLabel={t('antreanKontribusi')}
              renderItem={(k) => (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-neutral-800 dark:text-neutral-100">
                      {labelTipeKontribusi(k.tipe, trK)}
                    </p>
                    <BadgeStatusKontribusi status={k.status} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {labelTargetKontribusi(k.target_tipe, trK)}
                    {k.dibuat_pada && ` · ${formatTanggal(k.dibuat_pada, localeTag)}`}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{ringkasanMuatan(k, trK)}</p>
                </>
              )}
            />
          </aside>

          <section>
            {!pilihKontrib ? (
              <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
                {t('pilihKontrib')}
              </p>
            ) : (
              <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-primary-800 dark:text-primary-100">
                      {labelTipeKontribusi(pilihKontrib.tipe, trK)}
                    </h3>
                    {pilihKontrib.dibuat_pada && (
                      <time className="text-xs text-neutral-500" dateTime={pilihKontrib.dibuat_pada}>
                        {formatTanggal(pilihKontrib.dibuat_pada, localeTag)}
                      </time>
                    )}
                  </div>
                  <BadgeStatusKontribusi status={pilihKontrib.status} />
                </div>
                <MetaKontribusi item={pilihKontrib} />
                <KontribusiMuatanKurasi desaSlug={desaSlug} item={pilihKontrib} />
                {perluTombolTerapkan(pilihKontrib) && (
                  <BannerBelumDiterapkan desaSlug={desaSlug} item={pilihKontrib} />
                )}
                <PanelKeputusan
                  aktif={pilihKontrib.status === 'menunggu'}
                  onKeputusan={keputusanKontrib}
                />
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'paket' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_1fr]">
          <aside>
            <AntreanKurasi
              items={paket}
              selectedId={pilihPaketId}
              onSelect={(id) => void pilihPaketById(id)}
              loading={loading}
              loadingMessage={t('loading')}
              emptyMessage={t('emptyPaket')}
              ariaLabel={t('antreanPaket')}
              renderItem={(p) => (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-neutral-800 dark:text-neutral-100">{p.nama}</p>
                    <BadgeStatusPaket status={p.status} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {p.agen.nama} · {formatHarga(p.harga, p.satuan_harga, localeTag)}
                  </p>
                </>
              )}
            />
          </aside>
          <section>
            {!pilihPaket ? (
              <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
                {pilihPaketId ? t('loading') : t('pilihPaket')}
              </p>
            ) : (
              <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-primary-800 dark:text-primary-100">{pilihPaket.nama}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{pilihPaket.agen.nama}</p>
                  </div>
                  <BadgeStatusPaket status={pilihPaket.status} />
                </div>
                {sampulPaket && (
                  <div className="aspect-video overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sampulPaket} alt="" className="size-full object-cover" />
                  </div>
                )}
                {pilihPaket.deskripsi && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{pilihPaket.deskripsi}</p>
                )}
                <dl className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-neutral-500">{t('paketDurasi')}</dt>
                    <dd className="font-medium">{pilihPaket.durasi_jam} {t('jam')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-neutral-500">{t('paketHarga')}</dt>
                    <dd className="font-medium">{formatHarga(pilihPaket.harga, pilihPaket.satuan_harga, localeTag)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-neutral-500">{t('paketKuota')}</dt>
                    <dd className="font-medium">{pilihPaket.kuota_default}</dd>
                  </div>
                </dl>
                {itineraryPaket.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('itinerary')}</h4>
                    <div className="mt-3 space-y-4">
                      {itineraryPaket.map(({ hari, item }) => (
                        <div key={hari}>
                          <p className="text-xs font-bold uppercase text-primary-600 dark:text-primary-400">{t('hari', { hari })}</p>
                          <ol className="mt-2 space-y-2">
                            {item.map((it) => (
                              <li key={it.id} className="text-sm text-neutral-700 dark:text-neutral-300">
                                <span className="font-medium">{labelItemItinerary(it)}</span>
                                {it.durasi_menit > 0 && (
                                  <span className="text-neutral-500"> · {it.durasi_menit} {t('menit')}</span>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <PanelKeputusan
                  aktif={pilihPaket.status === 'review'}
                  labelSetuju={t('setujuiPublikasi')}
                  onKeputusan={keputusanPaket}
                />
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'log' && (
        <div className="space-y-4">
          <select
            value={filterLogEntitas}
            onChange={(e) => setFilterLogEntitas(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            aria-label={t('filterLogEntitas')}
          >
            <option value="">{t('filterSemuaEntitas')}</option>
            <option value="kontribusi">{t('entitas.kontribusi')}</option>
            <option value="paket_wisata">{t('entitas.paket_wisata')}</option>
          </select>

          {loading && log.length === 0 ? (
            <p className="text-sm text-neutral-500">{t('loading')}</p>
          ) : log.length === 0 ? (
            <p className="text-sm text-neutral-500">{t('emptyLog')}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-800/80 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">{t('logKolom.waktu')}</th>
                    <th className="px-4 py-3">{t('logKolom.entitas')}</th>
                    <th className="px-4 py-3">{t('logKolom.transisi')}</th>
                    <th className="px-4 py-3">{t('logKolom.keputusan')}</th>
                    <th className="px-4 py-3">{t('logKolom.catatan')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {log.map((entry) => (
                    <tr key={entry.id} className="bg-white dark:bg-neutral-900/40">
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {entry.dibuat_pada ? formatTanggal(entry.dibuat_pada, localeTag) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-800 dark:text-neutral-100">{entry.entitas_tipe}</span>
                        <span className="ms-1 text-xs text-neutral-500">#{entry.entitas_id.slice(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {entry.dari_status} → {entry.ke_status}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium dark:bg-neutral-800">
                          {entry.keputusan}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {entry.catatan?.trim() || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {adaLagiLog && (
            <button
              type="button"
              onClick={() => void muatLog(true)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-600"
            >
              {t('loadMore')}
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('footnote')}</p>
    </div>
  )
}
