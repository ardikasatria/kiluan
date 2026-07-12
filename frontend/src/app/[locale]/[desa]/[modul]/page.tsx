import { renderModulDesa } from '@/components/kiluan/ModulPlaceholderPage'
import { ambilModul, lokalisasiModul } from '@/lib/kiluan/modul-placeholder'
import { getProfilDesa } from '@/lib/api/desa'
import { metadataDesa } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

interface Props {
  params: Promise<{ desa: string; modul: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, modul } = await params
  const [config, profil, t] = await Promise.all([
    Promise.resolve(ambilModul(modul)),
    getProfilDesa(desa),
    getTranslations('modul'),
  ])
  if (!config) return { title: 'Modul' }
  const localized = lokalisasiModul(
    config,
    (key) => t(key as 'page.soon'),
    (key) => t.raw(key as 'page.soon'),
  )
  return metadataDesa({
    judul: localized.judul,
    desaSlug: desa,
    desaNama: profil?.nama,
    path: `/${modul}`,
    deskripsi: localized.deskripsi,
  })
}

export default async function ModulDesaPage({ params }: Props) {
  const { desa, modul } = await params
  return renderModulDesa(desa, modul)
}
