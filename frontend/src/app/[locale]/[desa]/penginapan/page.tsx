import { metadataLayananKatalog, renderLayananKatalogPage } from '@/lib/kiluan/layanan-katalog-page'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ desa: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa } = await params
  return metadataLayananKatalog({ desa, slug: 'penginapan' })
}

export default async function PenginapanPage({ params }: Props) {
  const { desa } = await params
  return renderLayananKatalogPage({ desa, slug: 'penginapan' })
}
