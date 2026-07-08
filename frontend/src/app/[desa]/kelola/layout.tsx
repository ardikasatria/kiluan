import KelolaNav from '@/components/kiluan/KelolaNav'
import OfflineIndicator from '@/components/kiluan/OfflineIndicator'
import PengelolaGuard from '@/components/kiluan/PengelolaGuard'

interface Props {
  children: React.ReactNode
  params: Promise<{ desa: string }>
}

export default async function KelolaLayout({ children, params }: Props) {
  const { desa } = await params
  return (
    <PengelolaGuard desaSlug={desa}>
      <div className="container py-8 sm:py-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">Kelola Desa</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">/{desa}</p>
          </div>
          <OfflineIndicator desaSlug={desa} />
        </div>
        <KelolaNav desaSlug={desa} />
        <div className="mt-8">{children}</div>
      </div>
    </PengelolaGuard>
  )
}
