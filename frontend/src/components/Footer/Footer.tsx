import Logo from '@/shared/Logo'
import PwaInstallButton from '@/components/kiluan/PwaInstallButton'
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
    id: 'jelajah',
    title: 'Jelajah',
    links: [
      { href: '/', label: 'Beranda Sigerciv' },
      { href: '/jelajah', label: 'Jelajah Lampung' },
      { href: '/jelajah?lensa=wisata', label: 'Spot unggulan' },
      { href: '/jelajah', label: 'Cari destinasi' },
    ],
  },
  {
    id: 'pengalaman',
    title: 'Pengalaman',
    links: [
      { href: '/jelajah?lensa=wisata', label: 'Paket wisata' },
      { href: '/jelajah', label: 'Penjelajah Lestari' },
      { href: '/paspor', label: 'Paspor Lestari' },
      { href: '/jelajah', label: 'Panduan & etik' },
    ],
  },
  {
    id: 'pasar',
    title: 'Pasar Desa',
    links: [
      { href: '/jelajah', label: 'UMKM lokal' },
      { href: '/jelajah', label: 'Tingkat sertifikasi' },
      { href: '/daftar?peran=umkm', label: 'Daftar sebagai UMKM' },
    ],
  },
  {
    id: 'komunitas',
    title: 'Komunitas',
    links: [
      { href: '/masuk', label: 'Masuk' },
      { href: '/daftar', label: 'Daftar akun' },
      { href: '/jelajah?lensa=desa', label: 'Desa di jaringan' },
      { href: '/#jejak-regeneratif', label: 'Jejak regeneratif' },
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
              Sigerciv — platform pariwisata regeneratif lintas desa di Lampung. Data destinasi dimiliki komunitas;
              nilai ekonomi kembali ke warga; ekspor data tersedia bagi pengelola yang berwenang.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PwaInstallButton variant="footer" />
              <Link
                href="mailto:sigerciv@sainsdataciv.com"
                className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-primary-700 dark:text-neutral-300 dark:hover:text-primary-300"
              >
                <HugeiconsIcon icon={Mail01Icon} size={18} />
                sigerciv@sainsdataciv.com
              </Link>
            </div>
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
