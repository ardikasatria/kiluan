import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

/** Wishlist wisatawan memakai rute global lintas Lampung. */
export default async function WishlistDesaRedirect({ params }: Props) {
  await params
  redirect('/saya/wishlist')
}
