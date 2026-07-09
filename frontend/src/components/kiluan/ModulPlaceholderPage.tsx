import { getProfilDesa } from '@/lib/api/desa'
import { ambilModul } from '@/lib/kiluan/modul-placeholder'
import type { ModulPlaceholderConfig } from '@/lib/kiluan/modul-placeholder'
import {
  ArrowLeftIcon,
  BeakerIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  config: ModulPlaceholderConfig
  desaSlug?: string
  profilNama?: string
}

export default function ModulPlaceholderPage({ config, desaSlug, profilNama }: Props) {
  const kembali = desaSlug ? `/${desaSlug}` : '/'
  const konteks = profilNama ?? (desaSlug ? desaSlug : 'sigerciv')

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 text-white dark:from-primary-950 dark:via-primary-900 dark:to-primary-800">
        <div className="container py-10 sm:py-14">
          <Link
            href={kembali}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-100 hover:text-white"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Kembali ke {desaSlug ? 'etalase' : 'beranda'}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-100 ring-1 ring-amber-300/30">
              <BeakerIcon className="size-3.5" aria-hidden />
              Segera hadir
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100">
              Fase {config.fase}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100">
              {config.modulLabel}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{config.judul}</h1>
          <p className="mt-2 text-sm text-primary-100/80">{konteks}</p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-primary-50/90 sm:text-lg">
            {config.deskripsi}
          </p>
        </div>
      </div>

      <div className="container py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-primary-800 dark:text-primary-100">
              <RocketLaunchIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
              Yang akan hadir
            </h2>
            <ul className="mt-5 space-y-3">
              {config.fiturRencana.map((fitur) => (
                <li
                  key={fitur}
                  className="flex gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/50"
                >
                  <CheckCircleIcon
                    className="mt-0.5 size-5 shrink-0 text-primary-500 dark:text-primary-400"
                    aria-hidden
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{fitur}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/40">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Sudah tersedia</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href={desaSlug ? `/${desaSlug}#destinasi` : '/#discovery'}
                    className="text-primary-700 hover:underline dark:text-primary-300"
                  >
                    Katalog destinasi
                  </Link>
                </li>
                <li>
                  <Link href="/masuk" className="text-primary-700 hover:underline dark:text-primary-300">
                    Masuk / daftar
                  </Link>
                </li>
                {desaSlug && (
                  <li>
                    <Link
                      href={`/${desaSlug}/kelola`}
                      className="text-primary-700 hover:underline dark:text-primary-300"
                    >
                      Dashboard pengelola
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <p className="rounded-2xl border border-dashed border-primary-300/60 bg-primary-50/50 px-4 py-3 text-xs leading-relaxed text-primary-800 dark:border-primary-600/40 dark:bg-primary-900/20 dark:text-primary-200">
              Modul ini masuk roadmap blueprint sigerciv. Fase 0 fokus etalase, auth, destinasi &amp; media —
              modul {config.modulLabel} direncanakan Fase {config.fase}.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}

export async function renderModulDesa(desa: string, modul: string) {
  const config = ambilModul(modul)
  if (!config || config.aktif) notFound()

  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return <ModulPlaceholderPage config={config} desaSlug={desa} profilNama={profil.nama} />
}
