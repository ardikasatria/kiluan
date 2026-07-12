import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

/** Akun & preferensi memakai rute global Sigerciv. */
export default async function AkunDesaRedirect({ params }: Props) {
  await params
  redirect('/saya/akun')
}
