import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KurasiPaketRedirect({ params }: Props) {
  const { desa } = await params
  redirect(`/${desa}/kelola/kurasi?tab=paket`)
}
