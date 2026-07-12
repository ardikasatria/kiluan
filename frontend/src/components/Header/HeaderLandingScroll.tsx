'use client'

import { useEffect } from 'react'

/** Menambah kelas `is-scrolled` pada header landing saat pengguna scroll. */
export default function HeaderLandingScroll() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.kiluan-header')
    if (!header) return

    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
