'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { daftarPeranPengguna, dasborHref, labelPeran, type PeranKode } from '@/lib/kiluan/peran'
import { konfigDasborPeran } from '@/lib/kiluan/dashboard-peran'
import {
  BuildingStorefrontIcon,
  GlobeAltIcon,
  MapIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import type { ComponentType } from 'react'

const IKON: Record<PeranKode, ComponentType<{ className?: string }>> = {
  wisatawan: MapIcon,
  pokdarwis: SparklesIcon,
  umkm: BuildingStorefrontIcon,
  agen: GlobeAltIcon,
  kontributor: UserGroupIcon,
  organisasi: ShieldCheckIcon,
  perangkat_desa: ShieldCheckIcon,
  admin: UserIcon,
}

interface Props {
  desaSlug: string
  profilNama: string
}

export default function DasborHub({ desaSlug, profilNama }: Props) {
  const { user } = useAuth()
  const peranSaya = daftarPeranPengguna(user?.profil ?? null)
  const configs = konfigDasborPeran(desaSlug)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Halo, <strong className="text-neutral-900 dark:text-neutral-100">{user?.name}</strong> — pilih dasbor
          sesuai peran aktif Anda di <strong>{profilNama}</strong>.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(configs) as PeranKode[])
          .filter((k) => k !== 'admin')
          .map((k) => {
            const cfg = configs[k]
            const punya = peranSaya.includes(k)
            const Icon = IKON[k]
            const href = dasborHref(desaSlug, k)

            return (
              <li key={k}>
                <Link
                  href={punya ? href : '#'}
                  aria-disabled={!punya}
                  className={clsx(
                    'flex h-full flex-col rounded-2xl border p-5 transition',
                    punya
                      ? 'border-neutral-200 bg-white hover:border-primary-400 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-primary-600'
                      : 'cursor-not-allowed border-dashed border-neutral-300 bg-neutral-50/50 opacity-60 dark:border-neutral-600 dark:bg-neutral-900/20',
                  )}
                  onClick={(e) => !punya && e.preventDefault()}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                      <Icon className="size-6" aria-hidden />
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      Fase {cfg.fase}
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-primary-800 dark:text-primary-100">
                    {labelPeran(k)}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">{cfg.tagline}</p>
                  <p className="mt-2 flex-1 text-sm text-neutral-600 dark:text-neutral-400">{cfg.deskripsi}</p>
                  {punya ? (
                    <span className="mt-4 text-sm font-semibold text-primary-700 dark:text-primary-300">
                      Buka dasbor →
                    </span>
                  ) : (
                    <span className="mt-4 text-xs text-neutral-500">Peran belum diaktifkan</span>
                  )}
                </Link>
              </li>
            )
          })}
      </ul>

      {peranSaya.includes('admin') && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-5 dark:border-primary-800 dark:bg-primary-950/30">
          <h3 className="font-semibold text-primary-800 dark:text-primary-100">Admin / Steward</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Dasbor lintas-tenant untuk provisioning dan moderasi platform.
          </p>
          <Link
            href="/admin/dasbor"
            className="mt-3 inline-flex text-sm font-semibold text-primary-700 dark:text-primary-300"
          >
            Buka dasbor admin →
          </Link>
        </div>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Perlu peran tambahan? Hubungi Pokdarwis atau perangkat desa untuk aktivasi keanggotaan.
      </p>
    </div>
  )
}
