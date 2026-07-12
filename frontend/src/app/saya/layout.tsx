import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import KiluanMeshBackground from '@/components/kiluan/KiluanMeshBackground'
import Link from 'next/link'

export default function SayaGlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <KiluanMeshBackground className="min-h-screen">
      <DasborGuard desaSlug="sigerciv" loginOnly>
        <div className="container py-6 sm:py-10">
          <div className="mb-6">
            <Link href="/" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
              Sigerciv
            </Link>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Akun & aktivitas · lintas desa wisata Lampung
            </p>
          </div>
          {children}
        </div>
      </DasborGuard>
    </KiluanMeshBackground>
  )
}
