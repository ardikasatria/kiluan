import { cariDestinasiKelola } from '@/lib/api/destinasi'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ desa: string }>
}

export default async function KelolaDestinasiPage({ params }: Props) {
  const { desa } = await params
  const hasil = await cariDestinasiKelola(desa)

  if (!hasil) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-primary-800 dark:text-primary-100">Daftar Destinasi</h2>
        <Link
          href={`/${desa}/kelola/destinasi/baru`}
          className="inline-flex justify-center rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Baru
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-800/80">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Nama</th>
              <th className="hidden px-4 py-3 text-left font-medium text-neutral-600 sm:table-cell dark:text-neutral-300">
                Slug
              </th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Status</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-700 dark:bg-neutral-900/40">
            {hasil.item.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{d.nama}</td>
                <td className="hidden px-4 py-3 text-neutral-500 sm:table-cell dark:text-neutral-400">{d.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      d.status === 'publikasi'
                        ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/${desa}/kelola/destinasi/${d.id}`}
                    className="text-primary-700 hover:underline dark:text-primary-300"
                  >
                    Ubah
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
