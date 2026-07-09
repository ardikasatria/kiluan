import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import OfflineIndicator from '@/components/kiluan/OfflineIndicator'
import { getProfilDesa } from '@/lib/api/desa'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  children: React.ReactNode
  params: Promise<{ desa: string }>
}

export default async function DasborLayout({ children, params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} loginOnly>
      <div className="container py-8 sm:py-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={`/${desa}`}
              className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              {profil.nama}
            </Link>
            <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">Dasbor sigerciv</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Kelola aktivitas sesuai peran keanggotaan Anda
            </p>
          </div>
          <OfflineIndicator desaSlug={desa} />
        </div>
        {children}
      </div>
    </DasborGuard>
  )
}
