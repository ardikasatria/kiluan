import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import DashboardSectionPlaceholder from '@/components/kiluan/dashboard/DashboardSectionPlaceholder'
import { getProfilDesa } from '@/lib/api/desa'
import { konfigDasborPeran, type PenerjemahDasbor } from '@/lib/kiluan/dashboard-peran'
import { peranDariSlug, type PeranKode } from '@/lib/kiluan/peran'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; peran: string; section: string }>
}

export default async function DasborSectionPage({ params }: Props) {
  const { desa, peran: peranSlug, section } = await params
  if (peranSlug === 'pokdarwis') {
    redirect(`/${desa}/dasbor/kontributor/${section}`)
  }
  const kode = peranDariSlug(peranSlug)
  if (!kode || kode === 'admin') redirect(`/${desa}/dasbor`)

  const profil = await getProfilDesa(desa)
  if (!profil) redirect(`/${desa}/dasbor`)

  if (kode === 'kontributor' && section === 'operasional') {
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
  if (section === 'layanan' && kode === 'umkm') {
    redirect(`/${desa}/saya/umkm/layanan`)
  }
  if (section === 'paket' && kode === 'agen') {
    redirect(`/${desa}/saya/paket`)
  }
  if (section === 'layanan' && kode === 'agen') {
    redirect(`/${desa}/saya/agen/layanan`)
  }
  if (section === 'kurasi' && kode === 'kontributor') {
    redirect(`/${desa}/kelola/kurasi`)
  }
  if (section === 'destinasi' && kode === 'kontributor') {
    redirect(`/${desa}/kelola/destinasi`)
  }
  if (section === 'kontribusi') {
    redirect(`/${desa}/kontribusi`)
  }
  if (section === 'sertifikasi') {
    redirect(`/${desa}/naik-kelas`)
  }
  if (section === 'keanggotaan') {
    redirect(`/${desa}/kelola/keanggotaan`)
  }
  if (section === 'verifikasi' && kode === 'perangkat_desa') {
    redirect(`/${desa}/kelola/keanggotaan`)
  }
  if (section === 'umkm' && (kode === 'kontributor' || kode === 'perangkat_desa')) {
    redirect(`/${desa}/kelola/umkm`)
  }

  const t = await getTranslations(`dasbor.${kode}`)
  const translators: Partial<Record<PeranKode, PenerjemahDasbor>> = {
    [kode]: t as unknown as PenerjemahDasbor,
  }
  const config = konfigDasborPeran(desa, translators)[kode]
  const navItem = config.nav.find((n) => n.segment === `/${section}`)

  return (
    <DasborGuard desaSlug={desa} desaNama={profil.nama} peran={kode}>
      <DashboardSectionPlaceholder
        desaSlug={desa}
        desaNama={profil.nama}
        config={config}
        sectionLabel={navItem?.label ?? section}
      />
    </DasborGuard>
  )
}
