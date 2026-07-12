import LayananKatalogClient from '@/components/kiluan/layanan/LayananKatalogClient'
import { getProfilDesa } from '@/lib/api/desa'
import { getLayananDesa } from '@/lib/api/layanan'
import { jenisDariSlugLayanan } from '@/lib/kiluan/layanan-katalog'
import { metadataDesa } from '@/lib/kiluan/seo'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface Params {
  desa: string
  slug: string
}

export async function metadataLayananKatalog({ desa, slug }: Params): Promise<Metadata> {
  const jenis = jenisDariSlugLayanan(slug)
  if (!jenis) return { title: 'Layanan' }

  const [profil, tJenis] = await Promise.all([
    getProfilDesa(desa),
    getTranslations('kelola.layanan.jenisOpsi'),
  ])

  let judul = jenis
  try {
    judul = tJenis(jenis as 'penginapan')
  } catch {
    /* fallback slug */
  }

  return (
    metadataDesa({
      judul,
      desaSlug: desa,
      desaNama: profil?.nama,
      path: `/${slug}`,
    }) ?? { title: judul }
  )
}

export async function renderLayananKatalogPage({ desa, slug }: Params) {
  const jenis = jenisDariSlugLayanan(slug)
  if (!jenis) notFound()

  const profil = await getProfilDesa(desa)
  if (!profil) notFound()

  const layanan = await getLayananDesa(desa, { jenis, status: 'publikasi' })

  return (
    <LayananKatalogClient desaSlug={desa} desaNama={profil.nama} jenis={jenis} layanan={layanan} />
  )
}
