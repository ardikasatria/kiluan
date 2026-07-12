import { getDaftarBerita } from '@/lib/api/berita'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KelolaBeritaPage({ params }: Props) {
  const { desa } = await params
  const hasil = await getDaftarBerita(desa, { kelola: true })

  if (!hasil) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">Kelola Warta</h2>
          <p className="mt-1 text-sm text-neutral-500">Draft, publikasi, arsip, dan penjadwalan tayang.</p>
        </div>
        <Link
          href={`/${desa}/kelola/berita/baru`}
          className="inline-flex justify-center rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Artikel baru
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-800/80">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Judul</th>
              <th className="hidden px-4 py-3 text-left font-medium text-neutral-600 sm:table-cell dark:text-neutral-300">
                Kategori
              </th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Status</th>
              <th className="hidden px-4 py-3 text-left font-medium text-neutral-600 md:table-cell dark:text-neutral-300">
                Terbit
              </th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-700 dark:bg-neutral-900/40">
            {hasil.item.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  Belum ada artikel. Buat artikel pertama.
                </td>
              </tr>
            ) : (
              hasil.item.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{b.judul}</span>
                    {b.sorotan && (
                      <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        sorotan
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 capitalize text-neutral-500 sm:table-cell dark:text-neutral-400">
                    {b.kategori}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        b.status === 'publikasi'
                          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                          : b.status === 'arsip'
                            ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      {b.status ?? 'draft'}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-500 md:table-cell dark:text-neutral-400">
                    {b.terbit_pada
                      ? new Date(b.terbit_pada).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${desa}/kelola/berita/${b.id}`}
                      className="text-primary-700 hover:underline dark:text-primary-300"
                    >
                      Ubah
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
