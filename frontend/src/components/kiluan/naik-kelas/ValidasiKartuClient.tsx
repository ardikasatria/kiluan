'use client'

import AntreanKurasi from '@/components/kiluan/kurasi/AntreanKurasi'
import PanelKeputusan from '@/components/kiluan/kurasi/PanelKeputusan'
import BuktiPengajuanPreview from '@/components/kiluan/naik-kelas/BuktiPengajuanPreview'
import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import { pesanGalat } from '@/lib/api/galat'
import { getAntreanValidasi, getSertifikasi, transisiPengajuan } from '@/lib/api/naik-kelas'
import type { PengajuanKartuItem, SertifikasiItem } from '@/lib/api/types'
import { labelStatusPengajuan } from '@/lib/kiluan/naik-kelas'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
}

export default function ValidasiKartuClient({ desaSlug }: Props) {
  const locale = useLocale()
  const t = useTranslations('kelola.validasiKartu')
  const tNaik = useTranslations('naikKelas')
  const tLib = tNaik as unknown as (key: string) => string
  const [antrean, setAntrean] = useState<PengajuanKartuItem[]>([])
  const [pilihId, setPilihId] = useState<string | null>(null)
  const [sertifikasi, setSertifikasi] = useState<SertifikasiItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const pilih = useMemo(() => antrean.find((p) => p.id === pilihId) ?? null, [antrean, pilihId])

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getAntreanValidasi(desaSlug, { status: 'menunggu' })
      setAntrean(res.item)
      setPilihId((prev) => {
        if (prev && res.item.some((p) => p.id === prev)) return prev
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

  useEffect(() => {
    if (!pilih) {
      setSertifikasi(null)
      return
    }
    void getSertifikasi(desaSlug, pilih.subjek_tipe, pilih.subjek_id).then(setSertifikasi)
  }, [pilih, desaSlug])

  async function putuskan(aksi: 'setuju' | 'tolak' | 'minta_revisi', catatan: string) {
    if (!pilih) return
    await transisiPengajuan(desaSlug, pilih.id, aksi, catatan)
    setSukses(t(`sukses.${aksi === 'setuju' ? 'setuju' : aksi === 'tolak' ? 'tolak' : 'minta_revisi'}`))
    await muat()
    if (aksi === 'setuju') {
      const s = await getSertifikasi(desaSlug, pilih.subjek_tipe, pilih.subjek_id)
      setSertifikasi(s)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>

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
            renderItem={(p) => (
              <>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {p.kartu.nama} · {t(`subjek.${p.subjek_tipe}` as 'subjek.umkm')}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {labelStatusPengajuan(p.status, tLib)}
                  {p.dibuat_pada && ` · ${formatTanggal(p.dibuat_pada, locale === 'en' ? 'en-US' : 'id-ID')}`}
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
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{pilih.kartu.nama}</p>
                <p className="mt-2 text-xs text-neutral-500">
                  {t(`subjek.${pilih.subjek_tipe}` as 'subjek.umkm')} · {pilih.subjek_id.slice(0, 8)}…
                </p>

                <div className="mt-4">
                  <BuktiPengajuanPreview bukti={pilih.bukti} />
                </div>

                {sertifikasi && (
                  <div className="mt-4 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      {t('tingkatSubjek')}
                    </p>
                    <div className="mt-2">
                      <TingkatSertifikasi tingkat={sertifikasi.tingkat} skor={sertifikasi.skor} size="md" />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {tNaik('skorPraktik', { skor: sertifikasi.skor })}
                    </p>
                  </div>
                )}
              </div>

              <PanelKeputusan
                aktif
                labelSetuju={t('validasi')}
                onKeputusan={async (aksi, catatan) => {
                  setGalat(null)
                  setSukses(null)
                  try {
                    await putuskan(aksi, catatan)
                  } catch (err) {
                    setGalat(pesanGalat(err, locale as 'id' | 'en'))
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

      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('footnote')}</p>
    </div>
  )
}
