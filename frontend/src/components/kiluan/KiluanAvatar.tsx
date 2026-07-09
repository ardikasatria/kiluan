'use client'

import Avatar from '@/shared/Avatar'
import { adalahUrlAvatar, inisialDariNama, warnaAvatarDariNama } from '@/lib/kiluan/avatar'

type Props = {
  nama: string
  src?: string | null
  alt?: string
  className?: string
  width?: number
  height?: number
  sizes?: string
  square?: boolean
}

/** Avatar pengguna: foto unggahan bila ada, selain itu inisial + warna dari nama. */
export default function KiluanAvatar({
  nama,
  src,
  alt,
  className,
  width = 40,
  height = 40,
  sizes,
  square,
}: Props) {
  const punyaFoto = adalahUrlAvatar(src)
  const initials = punyaFoto ? undefined : inisialDariNama(nama)
  const bg = punyaFoto ? undefined : warnaAvatarDariNama(nama)

  return (
    <Avatar
      src={punyaFoto ? src : undefined}
      initials={initials}
      alt={alt ?? nama}
      className={className}
      width={width}
      height={height}
      sizes={sizes}
      square={square}
      style={bg ? { backgroundColor: bg } : undefined}
    />
  )
}
