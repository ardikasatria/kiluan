import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataDasbor } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  children: React.ReactNode
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  return metadataDasbor('Dasbor', desa)
}

/** Header/footer situs dari [desa]/layout — di sini hanya guard + konten dasbor. */
export default async function DasborDesaLayout({ children, params }: Props) {
  const { desa } = await params
  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  return (
    <DasborGuard desaSlug={desa} desaNama={profil.nama} loginOnly>
      <div className="container py-8 sm:py-10">{children}</div>
    </DasborGuard>
  )
}
