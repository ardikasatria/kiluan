'use client'

import { Link } from '@/i18n/navigation'
import { pesanGalat } from '@/lib/api/galat'
import { getKapasitasHariIni, hitungKapasitas } from '@/lib/api/lestari'
import type { LevelKapasitas, PemakaianKapasitasDto } from '@/lib/api/types'
import { useAuth } from '@/contexts/AuthProvider'
import { adalahPengelolaKonten } from '@/lib/kiluan/kelola-akses'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  desaNama: string
}

function badge(level: LevelKapasitas) {
  if (level === 'merah') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  if (level === 'kuning') return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
}

function emoji(level: LevelKapasitas) {
  if (level === 'merah') return '🔴'
  if (level === 'kuning') return '🟡'
  return '🟢'
}

export default function KapasitasClient({ desaSlug, desaNama }: Props) {
  const t = useTranslations('lestari.kapasitas')
  const locale = useLocale() as 'id' | 'en'
  const { user } = useAuth()
  const steward = adalahPengelolaKonten(user?.profil ?? null)
  const [rows, setRows] = useState<PemakaianKapasitasDto[]>([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    setLoading(true)
    setGalat(null)
    try {
      const res = await getKapasitasHariIni(desaSlug)
      setRows(res.item)
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, locale])

  useEffect(() => {
    void muat()
  }, [muat])

  async function hitungUlang() {
    setGalat(null)
    try {
      await hitungKapasitas(desaSlug)
      await muat()
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    }
  }

  return (
    <div className="pb-16">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 to-white dark:from-primary-950 dark:to-neutral-950">
        <div className="container py-10">
          <p className="text-sm text-primary-600 dark:text-primary-400">{desaNama}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-primary-800 dark:text-primary-100">{t('title')}</h1>
            {steward && (
              <button type="button" onClick={() => void hitungUlang()} className="rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white">
                {t('hitungUlang')}
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
          <Link href={`/${desaSlug}/lestari/daya-dukung`} className="mt-3 inline-block text-sm text-primary-600 hover:underline dark:text-primary-400">
            {t('kelolaConfig')}
          </Link>
        </div>
      </div>
      <div className="container max-w-2xl py-8">
        {galat && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{galat}</p>}
        {loading ? (
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('empty')}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={`${r.destinasi_id}-${r.tanggal}`} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <div>
                  <p className="font-medium">{t('spot')} · {r.destinasi_id.slice(0, 8)}…</p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t(`levelLabel.${r.level}`)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${badge(r.level)}`}>
                  {emoji(r.level)} {Math.round(r.rasio * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
