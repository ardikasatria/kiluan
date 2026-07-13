import WisatawanKeanggotaanClient from '@/components/kiluan/dashboard/WisatawanKeanggotaanClient'
import { konfigDasborWisatawan } from '@/lib/kiluan/dashboard-peran'
import { metadataPrivat } from '@/lib/kiluan/seo'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dasbor.wisatawan.peran')
  return metadataPrivat(t('judul'), 'sigerciv', '/dasbor/wisatawan/peran', t('intro'))
}

export default async function DasborWisatawanPeranPage() {
  const t = await getTranslations('dasbor.wisatawan')
  const config = konfigDasborWisatawan(t as unknown as (key: string) => string)

  return <WisatawanKeanggotaanClient config={config} />
}
