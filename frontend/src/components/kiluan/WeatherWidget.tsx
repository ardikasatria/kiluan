'use client'

import type { CuacaResponse } from '@/lib/api/types'
import { CloudIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { WaveIcon, WindIcon } from './icons/WeatherIcons'

interface Props {
  cuaca: CuacaResponse | null
  className?: string
}

function KartuKeselamatan({ cuaca }: { cuaca: CuacaResponse }) {
  const maritim = cuaca.maritim
  const takTersedia = !maritim || maritim.status === 'tak_tersedia'
  const data = maritim?.perairan as Record<string, string> | undefined

  return (
    <div
      className={clsx(
        'rounded-2xl border p-4 sm:p-5',
        takTersedia
          ? 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50'
          : 'border-primary-300/60 bg-primary-50 dark:border-primary-600/40 dark:bg-primary-900/30',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            takTersedia
              ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
              : 'bg-primary-600 text-white dark:bg-primary-500',
          )}
        >
          {takTersedia ? (
            <ExclamationTriangleIcon className="size-5" aria-hidden />
          ) : (
            <WaveIcon className="size-5 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-primary-700 uppercase dark:text-primary-300">
            Keselamatan Bahari
          </p>
          {takTersedia ? (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Data maritim sementara tidak tersedia. Periksa kondisi laut langsung dengan nelayan setempat.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5 text-sm text-primary-900 dark:text-primary-100">
              {data?.tinggi_gelombang && (
                <p className="flex items-center gap-2">
                  <WaveIcon className="text-primary-600 dark:text-primary-400" />
                  <span>
                    Gelombang: <strong>{data.tinggi_gelombang}</strong>
                  </span>
                </p>
              )}
              {data?.angin && (
                <p className="flex items-center gap-2">
                  <WindIcon className="text-primary-600 dark:text-primary-400" />
                  <span>
                    Angin: <strong>{data.angin}</strong>
                  </span>
                </p>
              )}
              {data?.keterangan && (
                <p className="text-neutral-600 dark:text-neutral-400">{data.keterangan}</p>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
        Advisori keselamatan — bukan jaminan kondisi aman. Keputusan berlayar tetap pada kapten & nelayan setempat.
      </p>
    </div>
  )
}

function KartuDarat({ cuaca }: { cuaca: CuacaResponse }) {
  const darat = cuaca.darat
  const takTersedia = darat.status === 'tak_tersedia'
  const prakiraan = Array.isArray(darat.prakiraan) ? darat.prakiraan[0] : null
  const item = prakiraan as Record<string, unknown> | null

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="flex items-center gap-2">
        <CloudIcon className="size-5 text-neutral-500 dark:text-neutral-400" aria-hidden />
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Cuaca Darat</p>
      </div>
      {takTersedia || !item ? (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Data cuaca darat belum tersedia.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {item.t != null && (
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Suhu</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{String(item.t)}°C</dd>
            </div>
          )}
          {item.hu != null && (
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Kelembapan</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{String(item.hu)}%</dd>
            </div>
          )}
          {item.weather_desc != null && (
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-neutral-500 dark:text-neutral-400">Kondisi</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{String(item.weather_desc)}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}

export default function WeatherWidget({ cuaca, className }: Props) {
  if (!cuaca) return null

  return (
    <section className={clsx('space-y-3', className)} aria-label="Informasi cuaca BMKG">
      <KartuKeselamatan cuaca={cuaca} />
      <KartuDarat cuaca={cuaca} />
      <p className="text-center text-xs text-neutral-500 dark:text-neutral-500">
        Sumber: BMKG
        {cuaca.diperbarui ? ` · diperbarui ${new Date(cuaca.diperbarui).toLocaleString('id-ID')}` : ''}
      </p>
    </section>
  )
}
