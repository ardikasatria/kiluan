import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

/** Alias lama → halaman lencana pribadi (F5). */
export default async function LencanaRedirectPage({ params }: Props) {
  const { desa } = await params
  redirect(`/${desa}/saya/lencana`)
}
