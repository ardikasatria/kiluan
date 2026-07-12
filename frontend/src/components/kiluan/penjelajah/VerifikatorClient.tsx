'use client'

import AntreanKurasi from '@/components/kiluan/kurasi/AntreanKurasi'
import PanelKeputusan from '@/components/kiluan/kurasi/PanelKeputusan'
import { pesanGalat } from '@/lib/api/galat'
import { getVerifikasiAntrean, putuskanVerifikasi } from '@/lib/api/penjelajah'
import type { VerifikasiDto } from '@/lib/api/types'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

const StasiunPeta = dynamic(() => import('@/components/kiluan/penjelajah/StasiunPetaClient'), { ssr: false })

interface Props {
  desaSlug: string
}

function lokasiDariBukti(bukti: Record<string, unknown> | null | undefined) {
  const lok = bukti?.lokasi
  if (typeof lok === 'object' && lok !== null && 'lat' in lok && 'lng' in lok) {
    const lat = (lok as { lat: unknown }).lat
    const lng = (lok as { lng: unknown }).lng
    if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng }
  }
  return null
}

export default function VerifikatorClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.verifikasi')
  const [antrean, setAntrean] = useState<VerifikasiDto[]>([])
  const [pilihId, setPilihId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const pilih = useMemo(() => antrean.find((v) => v.id === pilihId) ?? null, [antrean, pilihId])

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getVerifikasiAntrean(desaSlug, {
        entitas_tipe: 'stempel',
        hasil: 'menunggu',
      })
      setAntrean(res.item)
      setPilihId((prev) => {
        if (prev && res.item.some((v) => v.id === prev)) return prev
        return res.item[0]?.id ?? null
      })
    } catch (err) {
      setGalat(pesanGalat(err, locale as 'id' | 'en') || t('errors.load'))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale, t])

  useEffect(() => {
    void muat()
  }, [muat])

  async function putuskan(aksi: 'setuju' | 'tolak', catatan: string) {
    if (!pilih) return
    const hasil = aksi === 'setuju' ? 'valid' : 'invalid'
    await putuskanVerifikasi(desaSlug, pilih.id, hasil, catatan)
    setSukses(t(`sukses.${hasil === 'valid' ? 'valid' : 'invalid'}`))
    await muat()
  }

  const lokasi = pilih ? lokasiDariBukti(pilih.bukti) : null
  const dampak = (pilih?.bukti?.dampak ?? {}) as Record<string, number>
  const fotoId = pilih?.bukti?.foto_media_id as string | undefined

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('desc')}</p>

      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{galat}</p>
      )}
      {sukses && (
        <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
          {sukses}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <AntreanKurasi
            items={antrean}
            selectedId={pilihId}
            onSelect={setPilihId}
            loading={loading}
            loadingMessage={t('loading')}
            emptyMessage={t('empty')}
            ariaLabel={t('antreanLabel')}
            renderItem={(v) => (
              <>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {t('stempel')} · {v.metode}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(v.dibuat_pada).toLocaleString(locale)}
                </p>
              </>
            )}
          />
        </div>

        <div className="space-y-4 lg:col-span-3">
          {pilih ? (
            <>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('detailTitle')}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">{t('metode')}</dt>
                    <dd className="font-medium text-neutral-800 dark:text-neutral-200">{pilih.metode}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">{t('entitas')}</dt>
                    <dd className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{pilih.entitas_id.slice(0, 8)}…</dd>
                  </div>
                </dl>

                {Object.keys(dampak).length > 0 && (
                  <div className="mt-4 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                      {t('dampakKlaim')}
                    </p>
                    <ul className="mt-1 text-sm text-emerald-900 dark:text-emerald-100">
                      {Object.entries(dampak).map(([k, v]) => (
                        <li key={k}>
                          {k}: {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fotoId && (
                  <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {t('fotoBukti', { id: fotoId.slice(0, 8) })}
                  </p>
                )}

                {lokasi && (
                  <StasiunPeta stasiun={lokasi} nama={t('lokasiBukti')} className="mt-4" />
                )}
              </div>

              <PanelKeputusan
                aktif
                sembunyikanRevisi
                labelSetuju={t('valid')}
                onKeputusan={async (aksi, catatan) => {
                  if (aksi === 'minta_revisi') return
                  setGalat(null)
                  setSukses(null)
                  try {
                    await putuskan(aksi, catatan)
                  } catch (err) {
                    setGalat(pesanGalat(err, locale as 'id' | 'en') || t('errors.putuskan'))
                    throw err
                  }
                }}
              />
            </>
          ) : (
            !loading && (
              <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-600">
                {t('empty')}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  )
}
