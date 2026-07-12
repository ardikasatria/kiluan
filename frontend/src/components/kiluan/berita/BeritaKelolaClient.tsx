'use client'

import { buatBerita, hapusBerita, ubahBerita, ubahStatusBerita } from '@/lib/api/berita'
import { kodeGalat, pesanGalat } from '@/lib/api/galat'
import { konfirmasiMedia, presignMedia, unggahKeMinio } from '@/lib/api/media'
import { getTagDesa } from '@/lib/api/desa'
import type { BeritaDetail, KategoriBerita, StatusBerita, Tag } from '@/lib/api/types'
import { KATEGORI_BERITA } from '@/lib/kiluan/berita'
import { formatTanggal } from '@/lib/kiluan/lencana'
import { ArrowLeftIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  awal?: BeritaDetail | null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function BeritaKelolaClient({ desaSlug, awal }: Props) {
  const router = useRouter()
  const editMode = Boolean(awal?.id)

  const [judul, setJudul] = useState(awal?.judul ?? '')
  const [slug, setSlug] = useState(awal?.slug ?? '')
  const [slugManual, setSlugManual] = useState(Boolean(awal?.slug))
  const [ringkasan, setRingkasan] = useState(awal?.ringkasan ?? '')
  const [konten, setKonten] = useState(awal?.konten ?? '')
  const [kategori, setKategori] = useState<KategoriBerita>(awal?.kategori ?? 'pengumuman')
  const [sorotan, setSorotan] = useState(awal?.sorotan ?? false)
  const [terbitPada, setTerbitPada] = useState(
    awal?.terbit_pada ? awal.terbit_pada.slice(0, 16) : '',
  )
  const [status, setStatus] = useState<StatusBerita>(awal?.status ?? 'draft')
  const [tagList, setTagList] = useState<Tag[]>([])
  const [tagPilih, setTagPilih] = useState<number[]>(awal?.tag.map((t) => t.id) ?? [])
  const [sampulUrl, setSampulUrl] = useState<string | null>(awal?.sampul?.url ?? null)
  const [sampulMediaId, setSampulMediaId] = useState<string | null>(null)
  const [unggahPct, setUnggahPct] = useState<number | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)

  useEffect(() => {
    void getTagDesa(desaSlug).then(setTagList)
  }, [desaSlug])

  useEffect(() => {
    if (!slugManual && judul) setSlug(slugify(judul))
  }, [judul, slugManual])

  const unggahSampul = useCallback(
    async (file: File) => {
      setGalat(null)
      setUnggahPct(0)
      try {
        const presign = await presignMedia(desaSlug, file)
        await unggahKeMinio(presign.url_unggah, file, setUnggahPct)
        const media = await konfirmasiMedia(desaSlug, {
          media_id: presign.media_id,
          tipe: 'foto',
        })
        setSampulMediaId(media.id)
        setSampulUrl(media.url ?? null)
      } catch (e) {
        setGalat(pesanGalat(e))
      } finally {
        setUnggahPct(null)
      }
    },
    [desaSlug],
  )

  const simpan = async () => {
    setGalat(null)
    setMenyimpan(true)
    const payload = {
      judul,
      slug,
      ringkasan: ringkasan || undefined,
      konten,
      kategori,
      sorotan,
      terbit_pada: terbitPada ? new Date(terbitPada).toISOString() : null,
      sampul_media_id: sampulMediaId ?? undefined,
    }
    try {
      if (editMode && awal) {
        await ubahBerita(desaSlug, awal.id, payload)
        router.push(`/${desaSlug}/kelola/berita/${awal.id}`)
        router.refresh()
      } else {
        const baru = await buatBerita(desaSlug, payload)
        router.push(`/${desaSlug}/kelola/berita/${baru.id}`)
      }
    } catch (e) {
      if (kodeGalat(e) === 'konflik') {
        setGalat('Slug sudah dipakai artikel lain. Gunakan slug yang berbeda.')
      } else {
        setGalat(pesanGalat(e))
      }
    } finally {
      setMenyimpan(false)
    }
  }

  const ubahStatus = async (s: StatusBerita) => {
    if (!awal) return
    setGalat(null)
    try {
      await ubahStatusBerita(
        desaSlug,
        awal.id,
        s,
        s === 'publikasi' && terbitPada ? new Date(terbitPada).toISOString() : terbitPada || null,
      )
      setStatus(s)
      router.refresh()
    } catch (e) {
      setGalat(pesanGalat(e))
    }
  }

  const arsipkan = () => void ubahStatus('arsip')

  const hapus = async () => {
    if (!awal || !confirm('Hapus artikel ini? (soft delete)')) return
    try {
      await hapusBerita(desaSlug, awal.id)
      router.push(`/${desaSlug}/kelola/berita`)
    } catch (e) {
      setGalat(pesanGalat(e))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/${desaSlug}/kelola/berita`}
          className="inline-flex items-center gap-2 text-sm text-primary-700 hover:underline dark:text-primary-300"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Daftar Warta
        </Link>
        {editMode && (
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium capitalize dark:bg-neutral-800">
            {status}
          </span>
        )}
      </div>

      {galat && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {galat}
        </p>
      )}

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40 sm:p-6">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Judul</label>
          <input
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Slug URL</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlugManual(true)
              setSlug(e.target.value)
            }}
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 font-mono text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Ringkasan</label>
          <textarea
            value={ringkasan}
            onChange={(e) => setRingkasan(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Konten (Markdown)</label>
          <textarea
            value={konten}
            onChange={(e) => setKonten(e.target.value)}
            rows={14}
            placeholder="## Judul bagian&#10;&#10;Tulis dengan **markdown**…"
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 font-mono text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Kategori</label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value as KategoriBerita)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            >
              {KATEGORI_BERITA.map((k) => (
                <option key={k.kode} value={k.kode}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Terbit pada</label>
            <input
              type="datetime-local"
              value={terbitPada}
              onChange={(e) => setTerbitPada(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
            <p className="mt-1 text-xs text-neutral-500">Kosongkan = tayang segera setelah publikasi</p>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sorotan}
            onChange={(e) => setSorotan(e.target.checked)}
            className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          Tampilkan sebagai sorotan (featured)
        </label>

        {tagList.length > 0 && (
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Tag</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tagList.map((t) => (
                <label key={t.id} className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={tagPilih.includes(t.id)}
                    onChange={(e) =>
                      setTagPilih((prev) =>
                        e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                      )
                    }
                    className="rounded border-neutral-300 text-primary-600"
                  />
                  {t.nama}
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sampul</p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {sampulUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sampulUrl} alt="Sampul" className="h-24 w-40 rounded-lg object-cover" />
            ) : (
              <div className="flex h-24 w-40 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                <PhotoIcon className="size-8 text-neutral-400" />
              </div>
            )}
            <label className="cursor-pointer rounded-full border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-300 dark:hover:bg-primary-950">
              Unggah foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void unggahSampul(f)
                }}
              />
            </label>
            {unggahPct != null && <span className="text-xs text-neutral-500">{unggahPct}%</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void simpan()}
          disabled={menyimpan || !judul || !slug}
          className="rounded-full bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {menyimpan ? 'Menyimpan…' : editMode ? 'Simpan perubahan' : 'Simpan draft'}
        </button>

        {editMode && status === 'draft' && (
          <button
            type="button"
            onClick={() => void ubahStatus('publikasi')}
            className="rounded-full border border-primary-600 px-5 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300"
          >
            Publikasikan
          </button>
        )}
        {editMode && status === 'publikasi' && (
          <button
            type="button"
            onClick={() => void arsipkan()}
            className="rounded-full border border-neutral-400 px-5 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Arsipkan
          </button>
        )}
        {editMode && status === 'arsip' && (
          <button
            type="button"
            onClick={() => void ubahStatus('draft')}
            className="rounded-full border border-neutral-400 px-5 py-2.5 text-sm font-medium"
          >
            Kembalikan ke draft
          </button>
        )}
        {editMode && (
          <button
            type="button"
            onClick={() => void hapus()}
            className="inline-flex items-center gap-1 rounded-full border border-red-300 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:text-red-300"
          >
            <TrashIcon className="size-4" />
            Hapus
          </button>
        )}
      </div>

      {editMode && awal?.terbit_pada && (
        <p className="text-xs text-neutral-500">Terjadwal / terbit: {formatTanggal(awal.terbit_pada)}</p>
      )}
    </div>
  )
}
