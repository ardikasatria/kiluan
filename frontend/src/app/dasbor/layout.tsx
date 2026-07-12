import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import KiluanMeshBackground from '@/components/kiluan/KiluanMeshBackground'
import { metadataPrivat } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = metadataPrivat(
  'Dasbor Sigerciv',
  'sigerciv',
  '/dasbor',
  'Dasbor pengguna Sigerciv — lintas desa wisata Lampung.',
)

export default function DasborGlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <KiluanMeshBackground className="min-h-screen">
      <DasborGuard desaSlug="sigerciv" loginOnly>
        <div className="container py-6 sm:py-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                Sigerciv
              </Link>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Dasbor pengguna · pariwisata regeneratif Lampung
              </p>
            </div>
          </div>
          {children}
        </div>
      </DasborGuard>
    </KiluanMeshBackground>
  )
}
