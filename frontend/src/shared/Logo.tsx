import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

interface Props {
  className?: string
  size?: string
}

const Logo: React.FC<Props> = ({ className, size = 'h-9 w-auto sm:h-10' }) => {
  return (
    <Link href="/" className={clsx('inline-block shrink-0', className)}>
      <Image
        src="/sigerciv-long.png"
        alt="sigerciv — Platform Desa Wisata Regeneratif"
        width={180}
        height={40}
        className={clsx(size, 'object-contain object-left')}
        priority
      />
    </Link>
  )
}

export default Logo
