import { renderModulDesa } from '@/components/kiluan/ModulPlaceholderPage'
import { ambilModul } from '@/lib/kiluan/modul-placeholder'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataDesa } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ desa: string; modul: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, modul } = await params
  const [config, profil] = await Promise.all([Promise.resolve(ambilModul(modul)), getProfilDesa(desa)])
  if (!config) return { title: 'Modul' }
  return metadataDesa({
    judul: config.judul,
    desaSlug: desa,
    desaNama: profil?.nama,
    path: `/${modul}`,
    deskripsi: config.deskripsi,
  })
}

export default async function ModulDesaPage({ params }: Props) {
  const { desa, modul } = await params
  return renderModulDesa(desa, modul)
}
