import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import DashboardSectionPlaceholder from '@/components/kiluan/dashboard/DashboardSectionPlaceholder'
import { konfigDasborPeran } from '@/lib/kiluan/dashboard-peran'
import { peranDariSlug } from '@/lib/kiluan/peran'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; peran: string; section: string }>
}

export default async function DasborSectionPage({ params }: Props) {
  const { desa, peran: peranSlug, section } = await params
  const kode = peranDariSlug(peranSlug)
  if (!kode || kode === 'admin') redirect(`/${desa}/dasbor`)

  if (kode === 'pokdarwis' && section === 'operasional') {
    redirect(`/${desa}/kelola`)
  }
  if (kode === 'wisatawan' && section === 'paspor') {
    redirect('/paspor')
  }
  if (section === 'lencana') {
    redirect(`/${desa}/saya/lencana`)
  }
  if (section === 'leaderboard') {
    redirect(`/${desa}/leaderboard`)
  }
  if (section === 'produk' && kode === 'umkm') {
    redirect(`/${desa}/saya/umkm/produk`)
  }
  if (section === 'paket' && kode === 'agen') {
    redirect(`/${desa}/saya/paket`)
  }
  if (section === 'kurasi' && kode === 'pokdarwis') {
    redirect(`/${desa}/kelola/kurasi-konten`)
  }
  if (section === 'kontribusi') {
    redirect(`/${desa}/kontribusi`)
  }
  if (section === 'sertifikasi') {
    redirect(`/${desa}/naik-kelas`)
  }

  const config = konfigDasborPeran(desa)[kode]
  const navItem = config.nav.find((n) => n.segment === `/${section}`)

  return (
    <DasborGuard desaSlug={desa} peran={kode}>
      <DashboardSectionPlaceholder
        desaSlug={desa}
        config={config}
        sectionLabel={navItem?.label ?? section}
      />
    </DasborGuard>
  )
}
