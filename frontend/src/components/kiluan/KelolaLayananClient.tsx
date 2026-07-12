'use client'

import { useAuth } from '@/contexts/AuthProvider'
import { cariDestinasiKelola } from '@/lib/api/destinasi'
import { kodeGalat, pesanGalat } from '@/lib/api/galat'
import { buatLayanan, getLayananDesa, hapusLayanan, ubahLayanan } from '@/lib/api/layanan'
import type { DestinasiRingkas, LayananBuatPayload, LayananItem } from '@/lib/api/types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Textarea from '@/shared/Textarea'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

const JENIS_OPSI = [
  'transportasi',
  'pemandu',
  'penginapan',
  'sewa_alat',
  'kuliner',
  'tiket_masuk',
  'lainnya',
] as const

const SATUAN_OPSI = ['per_orang', 'per_paket', 'per_hari', 'per_unit'] as const

interface Props {
  desaSlug: string
  awal: LayananItem[]
  /** pengelola = semua layanan desa; pemilik = hanya milik penyediaId */
  mode?: 'pengelola' | 'pemilik'
  penyediaId?: string
  /** Kunci intro mode pemilik — default pemilikIntro */
  introKey?: 'pemilikIntro' | 'pemilikIntroAgen'
}

const FORM_KOSONG: LayananBuatPayload = {
  nama: '',
  jenis: 'transportasi',
  deskripsi: '',
  harga: 0,
  satuan_harga: 'per_paket',
  destinasi_id: null,
  penyedia_id: null,
  ketersediaan: { kuota_harian: 10 },
  status: 'draft',
}

export default function KelolaLayananClient({
  desaSlug,
  awal,
  mode = 'pengelola',
  penyediaId,
  introKey = 'pemilikIntro',
}: Props) {
  const { user, isLoading: authLoading } = useAuth()
  const locale = useLocale()
  const t = useTranslations('kelola.layanan')
  const tr = t as unknown as (key: string) => string
  const pemilikId = mode === 'pemilik' ? penyediaId ?? user?.id : penyediaId
  const [daftar, setDaftar] = useState(awal)
  const [destinasi, setDestinasi] = useState<DestinasiRingkas[]>([])
  const [form, setForm] = useState<LayananBuatPayload>({ ...FORM_KOSONG })
  const [editId, setEditId] = useState<string | null>(null)
  const [filterJenis, setFilterJenis] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)

  const muat = useCallback(async () => {
    const item = await getLayananDesa(desaSlug, {
      jenis: filterJenis || undefined,
      status: filterStatus || undefined,
    })
    setDaftar(item)
  }, [desaSlug, filterJenis, filterStatus])

  useEffect(() => {
    void muat()
    void cariDestinasiKelola(desaSlug).then((r) => setDestinasi(r.item))
  }, [desaSlug, muat])

  const daftarTampil = useMemo(() => {
    if (mode === 'pemilik' && pemilikId) {
      return daftar.filter((l) => l.penyedia?.id === pemilikId)
    }
    return daftar
  }, [daftar, mode, pemilikId])

  const bolehEdit = (item: LayananItem) => {
    if (mode === 'pengelola') return true
    if (!pemilikId) return false
    return item.penyedia?.id === pemilikId
  }

  const resetForm = () => {
    setForm({ ...FORM_KOSONG, penyedia_id: mode === 'pemilik' ? pemilikId ?? null : null })
    setEditId(null)
  }

  const mulaiEdit = (item: LayananItem) => {
    if (!bolehEdit(item)) return
    setEditId(item.id)
    setForm({
      nama: item.nama,
      jenis: item.jenis,
      deskripsi: item.deskripsi ?? '',
      harga: item.harga,
      satuan_harga: item.satuan_harga,
      destinasi_id: item.destinasi_id ?? null,
      penyedia_id: item.penyedia?.id ?? null,
      ketersediaan: item.ketersediaan ?? { kuota_harian: 10 },
      status: item.status,
    })
  }

  const simpan = async (e: FormEvent) => {
    e.preventDefault()
    setGalat(null)
    setPesan(null)
    setMenyimpan(true)
    const payload: LayananBuatPayload = {
      ...form,
      harga: Number(form.harga),
      penyedia_id: mode === 'pemilik' ? pemilikId ?? null : form.penyedia_id,
    }
    try {
      if (editId) {
        await ubahLayanan(desaSlug, editId, payload)
        setPesan(t('updated'))
      } else {
        await buatLayanan(desaSlug, payload)
        setPesan(t('added'))
      }
      resetForm()
      await muat()
    } catch (err) {
      if (kodeGalat(err) === 'tidak_diizinkan') {
        setGalat(t('forbidden'))
      } else {
        setGalat(pesanGalat(err, locale as 'id' | 'en'))
      }
    } finally {
      setMenyimpan(false)
    }
  }

  const hapus = async (item: LayananItem) => {
    if (!bolehEdit(item) || !confirm(t('hapusKonfirmasi'))) return
    setGalat(null)
    try {
      await hapusLayanan(desaSlug, item.id)
      if (editId === item.id) resetForm()
      await muat()
      setPesan(t('deleted'))
    } catch (err) {
      if (kodeGalat(err) === 'tidak_diizinkan') {
        setGalat(t('forbidden'))
      } else {
        setGalat(pesanGalat(err, locale as 'id' | 'en'))
      }
    }
  }

  if (mode === 'pemilik' && authLoading) {
    return <p className="text-sm text-neutral-500">{t('memuatSesi')}</p>
  }

  if (mode === 'pemilik' && !pemilikId) {
    return <p className="text-sm text-neutral-500">{t('butuhMasuk')}</p>
  }

  return (
    <div className="space-y-8">
      {mode === 'pemilik' && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t(introKey)}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <Select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)} className="text-sm">
          <option value="">{t('filterSemuaJenis')}</option>
          {JENIS_OPSI.map((j) => (
            <option key={j} value={j}>
              {tr(`jenisOpsi.${j}`)}
            </option>
          ))}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm">
          <option value="">{t('filterSemuaStatus')}</option>
          <option value="draft">{t('status.draft')}</option>
          <option value="publikasi">{t('status.publikasi')}</option>
          <option value="arsip">{t('status.arsip')}</option>
        </Select>
      </div>

      <form
        onSubmit={simpan}
        className="max-w-2xl space-y-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700 dark:bg-neutral-800/40"
      >
        <h3 className="font-semibold text-primary-800 dark:text-primary-100">
          {editId ? t('ubah') : t('tambah')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <Label>{t('nama')}</Label>
            <Input
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              className="mt-1"
              required
            />
          </Field>
          <Field>
            <Label>{t('jenis')}</Label>
            <Select value={form.jenis} onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value }))} className="mt-1">
              {JENIS_OPSI.map((j) => (
                <option key={j} value={j}>
                  {tr(`jenisOpsi.${j}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>{t('harga')}</Label>
            <Input
              type="number"
              value={form.harga}
              onChange={(e) => setForm((f) => ({ ...f, harga: Number(e.target.value) }))}
              className="mt-1"
              required
            />
          </Field>
          <Field>
            <Label>{t('satuan')}</Label>
            <Select
              value={form.satuan_harga}
              onChange={(e) => setForm((f) => ({ ...f, satuan_harga: e.target.value }))}
              className="mt-1"
            >
              {SATUAN_OPSI.map((s) => (
                <option key={s} value={s}>
                  {tr(`satuanOpsi.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>{t('destinasi')}</Label>
            <Select
              value={form.destinasi_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, destinasi_id: e.target.value || null }))}
              className="mt-1"
            >
              <option value="">{t('destinasiOpsional')}</option>
              {destinasi.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>{t('kuota')}</Label>
            <Input
              type="number"
              value={String((form.ketersediaan as { kuota_harian?: number })?.kuota_harian ?? '')}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  ketersediaan: { kuota_harian: Number(e.target.value) || 0 },
                }))
              }
              className="mt-1"
            />
          </Field>
          <Field>
            <Label>{t('statusLabel')}</Label>
            <Select
              value={form.status ?? 'draft'}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="mt-1"
            >
              <option value="draft">{t('status.draft')}</option>
              <option value="publikasi">{t('status.publikasi')}</option>
              <option value="arsip">{t('status.arsip')}</option>
            </Select>
          </Field>
          <Field className="sm:col-span-2">
            <Label>{t('deskripsi')}</Label>
            <Textarea
              value={form.deskripsi ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
              rows={3}
              className="mt-1"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonPrimary type="submit" disabled={menyimpan}>
            {menyimpan ? t('menyimpan') : editId ? t('simpanUbah') : t('simpan')}
          </ButtonPrimary>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600"
            >
              {t('batal')}
            </button>
          )}
        </div>
        {galat && <p className="text-sm text-red-700 dark:text-red-300">{galat}</p>}
        {pesan && <p className="text-sm text-primary-700 dark:text-primary-300">{pesan}</p>}
      </form>

      <ul className="space-y-3">
        {daftarTampil.length === 0 && (
          <li className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-600">
            {mode === 'pemilik' ? t('emptyPemilik') : t('empty')}
          </li>
        )}
        {daftarTampil.map((l) => (
          <li
            key={l.id}
            className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center dark:border-neutral-700"
          >
            <div>
              <p className="font-medium">{l.nama}</p>
              <p className="text-sm text-neutral-500">
                {tr(`jenisOpsi.${l.jenis}`)} · {tr(`status.${l.status}`)}
                {mode === 'pengelola' && l.penyedia?.nama ? ` · ${l.penyedia.nama}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-semibold text-primary-700 dark:text-primary-300">
                Rp {l.harga.toLocaleString(locale === 'en' ? 'en-US' : 'id-ID')}
              </p>
              {bolehEdit(l) ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => mulaiEdit(l)}
                    className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    aria-label={t('ubah')}
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void hapus(l)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label={t('hapus')}
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-neutral-400">{t('readOnly')}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
