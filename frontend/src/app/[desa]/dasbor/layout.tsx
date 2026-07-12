import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import OfflineIndicator from '@/components/kiluan/OfflineIndicator'
import KiluanMeshBackground from '@/components/kiluan/KiluanMeshBackground'
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
    <KiluanMeshBackground className="min-h-screen">
      <DasborGuard desaSlug={desa} desaNama={profil.nama} loginOnly>
        <div className="container py-6 sm:py-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href={`/${desa}`}
                className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
              >
                {profil.nama}
              </Link>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Dasbor sigerciv · kelola sesuai peran keanggotaan
              </p>
            </div>
            <OfflineIndicator desaSlug={desa} />
          </div>
          {children}
        </div>
      </DasborGuard>
    </KiluanMeshBackground>
  )
}
