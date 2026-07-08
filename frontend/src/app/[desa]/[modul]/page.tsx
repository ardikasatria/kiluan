import { renderModulDesa } from '@/components/kiluan/ModulPlaceholderPage'
import { ambilModul } from '@/lib/kiluan/modul-placeholder'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ desa: string; modul: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modul } = await params
  const config = ambilModul(modul)
  return {
    title: config ? `${config.judul} — Segera hadir` : 'Modul',
    description: config?.deskripsi,
  }
}

export default async function ModulDesaPage({ params }: Props) {
  const { desa, modul } = await params
  return renderModulDesa(desa, modul)
}
