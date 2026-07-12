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
      { href: '/', label: 'Beranda sigerciv' },
      { href: '/teluk-kiluan', label: 'Teluk Kiluan' },
      { href: '/#spot-unggulan', label: 'Spot unggulan' },
      { href: '/#discovery', label: 'Cari destinasi' },
    ],
  },
  {
    id: 'pengalaman',
    title: 'Pengalaman',
    links: [
      { href: '/teluk-kiluan/paket', label: 'Paket wisata' },
      { href: '/teluk-kiluan/misi', label: 'Penjelajah Lestari' },
      { href: '/paspor', label: 'Paspor Lestari' },
      { href: '/teluk-kiluan/panduan', label: 'Panduan berkunjung' },
    ],
  },
  {
    id: 'pasar',
    title: 'Pasar Desa',
    links: [
      { href: '/teluk-kiluan/pasar', label: 'UMKM lokal' },
      { href: '/teluk-kiluan/sertifikasi', label: 'Tingkat sertifikasi' },
      { href: '/daftar?peran=umkm', label: 'Daftar sebagai UMKM' },
    ],
  },
  {
    id: 'komunitas',
    title: 'Komunitas',
    links: [
      { href: '/masuk', label: 'Masuk' },
      { href: '/daftar', label: 'Daftar akun' },
      { href: '/teluk-kiluan/tentang', label: 'Tentang desa' },
      { href: '/teluk-kiluan/berita', label: 'Warta & Berita' },
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
              sigerciv — platform desa wisata regeneratif berbasis komunitas. Data destinasi dimiliki desa;
              nilai ekonomi kembali ke warga; ekspor data tersedia bagi pengelola yang berwenang.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PwaInstallButton variant="footer" />
              <Link
                href="mailto:kiluan@sainsdataciv.com"
                className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-primary-700 dark:text-neutral-300 dark:hover:text-primary-300"
              >
                <HugeiconsIcon icon={Mail01Icon} size={18} />
                kiluan@sainsdataciv.com
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
