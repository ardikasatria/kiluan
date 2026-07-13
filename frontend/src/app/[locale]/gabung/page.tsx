import GabungKomunitasClient from '@/components/kiluan/gabung/GabungKomunitasClient'
import { getPeran } from '@/lib/api/referensi'
import { peranGabungValid } from '@/lib/kiluan/gabung'
import { buatMetadata } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('gabung.seo')
  return buatMetadata({
    judul: t('title'),
    deskripsi: t('description'),
    path: '/gabung',
    gambar: '/gallery/laguna.jpg',
  })
}

export default async function GabungPage({ searchParams }: Props) {
  const sp = await searchParams
  const raw = typeof sp.peran === 'string' ? sp.peran : undefined
  const peranAwal = peranGabungValid(raw) ?? undefined
  const desaAwal = typeof sp.desa === 'string' ? sp.desa : undefined
  const peranRef = await getPeran()

  return <GabungKomunitasClient peranRef={peranRef} peranAwal={peranAwal} desaAwal={desaAwal} />
}
