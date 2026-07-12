'use client'

import TingkatSertifikasi from '@/components/kiluan/pasar/TingkatSertifikasi'
import type { KartuAksiItem, SertifikasiItem } from '@/lib/api/types'
import { kartuTervalidasiSet, persenProgresTingkat } from '@/lib/kiluan/naik-kelas'
import { labelTingkat } from '@/lib/i18n/referensi'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useLocale, useTranslations } from 'next-intl'

interface Props {
  sertifikasi: SertifikasiItem | null
  kartu: KartuAksiItem[]
}

export default function ProgresTingkatPanel({ sertifikasi, kartu }: Props) {
  const t = useTranslations('naikKelas.progres')
  const locale = useLocale()
  const tervalidasi = kartuTervalidasiSet(sertifikasi)
  const pct = persenProgresTingkat(sertifikasi)
  const progres = sertifikasi?.progres

  return (
    <section className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 dark:border-primary-800 dark:from-primary-950/50 dark:to-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-100">{t('title')}</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
        <TingkatSertifikasi tingkat={sertifikasi?.tingkat} skor={sertifikasi?.skor ?? 0} size="md" />
      </div>

      {progres?.skor_berikut != null && progres.tingkat_berikut ? (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>{t('skorSaatIni', { skor: sertifikasi?.skor ?? 0 })}</span>
            <span>
              {t('menuju', {
                tingkat: labelTingkat(progres.tingkat_berikut, locale as 'id' | 'en'),
                skor: progres.skor_berikut,
              })}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-primary-600 transition-all dark:bg-primary-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : sertifikasi?.tingkat === 'lumba_lumba' ? (
        <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">{t('tingkatMaks')}</p>
      ) : (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{t('mulai')}</p>
      )}

      {progres?.ambang_tingkat && progres.ambang_tingkat.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {progres.ambang_tingkat.map((a) => (
            <li
              key={a.tingkat}
              className="rounded-lg border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700"
            >
              {labelTingkat(a.tingkat, locale as 'id' | 'en')} · {a.skor_min}+
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-5 space-y-2">
        {kartu.map((k) => {
          const done = tervalidasi.has(k.id)
          return (
            <li key={k.id} className="flex items-center gap-2 text-sm">
              <CheckCircleIcon
                className={`size-5 shrink-0 ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-300 dark:text-neutral-600'}`}
              />
              <span className={done ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-500 dark:text-neutral-400'}>
                {k.nama}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">{t('insentif')}</p>
    </section>
  )
}
