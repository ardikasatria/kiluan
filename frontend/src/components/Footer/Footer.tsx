import Logo from '@/shared/Logo'
import { Mail01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import React from 'react'

export interface FooterLink {
  href: string
  label: string
  external?: boolean
}

export interface FooterColumn {
  id: string
  title: string
  links: FooterLink[]
}

const footerColumns: FooterColumn[] = [
  {
    id: 'gerbang',
    title: 'Gerbang',
    links: [
      { href: '/', label: 'Beranda sigerciv' },
      { href: '/teluk-kiluan', label: 'Teluk Kiluan' },
      { href: '/#discovery', label: 'Cari destinasi' },
      { href: '/teluk-kiluan#destinasi', label: 'Katalog spot' },
    ],
  },
  {
    id: 'komunitas',
    title: 'Komunitas',
    links: [
      { href: '/masuk', label: 'Masuk' },
      { href: '/daftar', label: 'Daftar akun' },
      { href: '/teluk-kiluan/dasbor', label: 'Dasbor peran' },
      { href: '/teluk-kiluan/kelola', label: 'Dashboard pengelola' },
      { href: '/teluk-kiluan/pasar', label: 'Pasar Desa' },
    ],
  },
  {
    id: 'lestari',
    title: 'Lestari',
    links: [
      { href: '/teluk-kiluan/misi', label: 'Misi sigerciv' },
      { href: '/paspor', label: 'Paspor Lestari' },
      { href: '/teluk-kiluan/neraca-regeneratif', label: 'Neraca Regeneratif' },
      { href: '/teluk-kiluan/dana-konservasi', label: 'Dana konservasi' },
    ],
  },
  {
    id: 'platform',
    title: 'Platform',
    links: [
      {
        href: 'https://sainsdataciv.com',
        label: 'Sains Data CIV · ITERA',
        external: true,
      },
      { href: '/teluk-kiluan/tentang', label: 'Tentang desa' },
      { href: '/teluk-kiluan/panduan', label: 'Panduan berkunjung' },
      { href: 'mailto:kiluan@sainsdataciv.com', label: 'Hubungi tim', external: true },
    ],
  },
]

const Footer: React.FC = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="nc-Footer relative border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="container py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-6 lg:gap-12">
          <div className="lg:col-span-2">
            <Logo size="h-12 w-auto sm:h-14" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              sigerciv — platform desa wisata regeneratif berbasis komunitas. Mesin dapat direplikasi ke desa
              mitra; instans perdana Teluk Kiluan, Lampung.
            </p>
            <Link
              href="mailto:kiluan@sainsdataciv.com"
              className="mt-5 inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-primary-700 dark:text-neutral-300 dark:hover:text-primary-300"
            >
              <HugeiconsIcon icon={Mail01Icon} size={18} />
              kiluan@sainsdataciv.com
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            {footerColumns.map((col) => (
              <div key={col.id}>
                <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-100">{col.title}</h2>
                <ul className="mt-4 space-y-3">
                  {col.links.map((item) => (
                    <li key={item.href + item.label}>
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-neutral-600 hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-300"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className="text-sm text-neutral-600 hover:text-primary-700 dark:text-neutral-400 dark:hover:text-primary-300"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-neutral-200 pt-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:text-neutral-500">
          <p>© {year} sigerciv · Kelompok Keilmuan CIV, Program Studi Sains Data ITERA.</p>
          <p className="text-xs">sigerciv.com · PWA offline-first</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
