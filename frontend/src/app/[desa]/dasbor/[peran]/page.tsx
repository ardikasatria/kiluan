import DasborGuard from '@/components/kiluan/dashboard/DasborGuard'
import RoleDashboardView from '@/components/kiluan/dashboard/RoleDashboardView'
import { cariDestinasiKelola, getKalenderDesa, getLayananDesa } from '@/lib/api/destinasi'
import { konfigDasborPeran } from '@/lib/kiluan/dashboard-peran'
import { peranDariSlug } from '@/lib/kiluan/peran'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string; peran: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desa, peran } = await params
  const kode = peranDariSlug(peran)
  if (!kode) return { title: 'Dasbor' }
  const cfg = konfigDasborPeran(desa)[kode]
  return { title: `Dasbor — ${cfg?.tagline ?? peran}` }
}

async function statsPokdarwis(desa: string) {
  const [destinasi, layanan, kalender] = await Promise.all([
    cariDestinasiKelola(desa),
    getLayananDesa(desa),
    getKalenderDesa(desa),
  ])
  const publik = destinasi.item.filter((d) => d.status === 'publikasi').length
  const draft = destinasi.item.filter((d) => d.status === 'draft').length
  return {
    publik,
    draft,
    layanan: layanan.length,
    kontrib: '—',
    spot: publik + draft,
    anggota: '—',
    verif: 0,
    dana: '—',
  }
}

export default async function DasborPeranPage({ params }: Props) {
  const { desa, peran: peranSlug } = await params
  const kode = peranDariSlug(peranSlug)
  if (!kode || kode === 'admin') notFound()

  const configs = konfigDasborPeran(desa)
  const config = configs[kode]

  let statsOverride: Record<string, string | number> | undefined
  if (kode === 'pokdarwis') {
    const s = await statsPokdarwis(desa)
    statsOverride = {
      publik: s.publik,
      draft: s.draft,
      layanan: s.layanan,
      kontrib: s.kontrib,
    }
  }
  if (kode === 'perangkat_desa') {
    const s = await statsPokdarwis(desa)
    statsOverride = { spot: s.spot, anggota: s.anggota, verif: s.verif, dana: s.dana }
  }

  return (
    <DasborGuard desaSlug={desa} peran={kode}>
      <RoleDashboardView desaSlug={desa} config={config} statsOverride={statsOverride} />
    </DasborGuard>
  )
}
