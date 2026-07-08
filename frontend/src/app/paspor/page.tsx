import ModulPlaceholderPage from '@/components/kiluan/ModulPlaceholderPage'
import { ambilModul } from '@/lib/kiluan/modul-placeholder'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const config = ambilModul('paspor')
  return {
    title: config ? `${config.judul} — Segera hadir` : 'Paspor Lestari',
    description: config?.deskripsi,
  }
}

export default function PasporPage() {
  const config = ambilModul('paspor')
  if (!config) notFound()

  return <ModulPlaceholderPage config={config} />
}
