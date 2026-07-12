import { cariDestinasiKelola } from '@/lib/api/destinasi'
import { getKalenderDesa } from '@/lib/api/kalender'
import { getLayananDesa } from '@/lib/api/layanan'
import { getProfilDesa } from '@/lib/api/desa'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KelolaRingkasanPage({ params }: Props) {
  const { desa } = await params
  const t = await getTranslations('kelola.ringkasan')
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  const [destinasi, layanan, kalender] = await Promise.all([
    cariDestinasiKelola(desa),
    getLayananDesa(desa),
    getKalenderDesa(desa),
  ])

  const publik = destinasi.item.filter((d) => d.status === 'publikasi').length
  const draft = destinasi.item.filter((d) => d.status === 'draft').length

  const kartu = [
    { label: t('publik'), nilai: publik, href: `/${desa}/kelola/destinasi` },
    { label: t('draft'), nilai: draft, href: `/${desa}/kelola/destinasi` },
    { label: t('layanan'), nilai: layanan.length, href: `/${desa}/kelola/layanan` },
    { label: t('kalender'), nilai: kalender.length, href: `/${desa}/kelola/kalender` },
  ]

  return (
    <div className="space-y-8">
      <p className="text-neutral-600 dark:text-neutral-400">
        {t('intro', { desa: profil.nama })}
      </p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kartu.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:border-primary-600"
          >
            <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{k.nilai}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{k.label}</p>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/${desa}/dasbor/pokdarwis`}
          className="inline-flex rounded-full border border-primary-300 px-5 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-200 dark:hover:bg-primary-900/30"
        >
          {t('dasborPokdarwis')}
        </Link>
        <Link
          href={`/${desa}/kelola/destinasi/baru`}
        className="inline-flex rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
      >
        {t('tambahDestinasi')}
        </Link>
      </div>
    </div>
  )
}
