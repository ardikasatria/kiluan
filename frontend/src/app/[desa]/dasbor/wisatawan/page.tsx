import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

/** Wisatawan memakai dasbor global lintas Lampung. */
export default async function DasborWisatawanRedirect({ params }: Props) {
  await params
  redirect('/dasbor/wisatawan')
}
