'use client'

import { getLayananDesa } from '@/lib/api/destinasi'
import type { LayananItem } from '@/lib/api/types'
import { tambahAntrean } from '@/lib/offline/db'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { FormEvent, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  awal: LayananItem[]
}

export default function KelolaLayananClient({ desaSlug, awal }: Props) {
  const [daftar, setDaftar] = useState(awal)
  const [nama, setNama] = useState('')
  const [jenis, setJenis] = useState('transportasi')
  const [harga, setHarga] = useState('350000')
  const [pesan, setPesan] = useState<string | null>(null)

  useEffect(() => {
    getLayananDesa(desaSlug).then(setDaftar).catch(() => {})
  }, [desaSlug])

  const tambah = async (e: FormEvent) => {
    e.preventDefault()
    const body = {
      nama,
      jenis,
      harga: Number(harga),
      satuan_harga: 'per_paket',
      status: 'draft',
    }
    if (!navigator.onLine) {
      await tambahAntrean({
        desaSlug,
        method: 'POST',
        path: `/api/v1/desa/${desaSlug}/layanan`,
        body: JSON.stringify(body),
      })
      setPesan('Disimpan ke antrean offline.')
      return
    }
    setPesan('Layanan ditambahkan (mock/demo jika API offline).')
    setDaftar((d) => [
      ...d,
      {
        id: `local-${Date.now()}`,
        nama,
        jenis,
        harga: Number(harga),
        satuan_harga: 'per_paket',
        status: 'draft',
      },
    ])
    setNama('')
  }

  return (
    <div className="space-y-8">
      <form onSubmit={tambah} className="max-w-xl space-y-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700 dark:bg-neutral-800/40">
        <h3 className="font-semibold text-primary-800 dark:text-primary-100">Tambah layanan</h3>
        <Field>
          <Label>Nama</Label>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} className="mt-1" required />
        </Field>
        <Field>
          <Label>Jenis</Label>
          <Select value={jenis} onChange={(e) => setJenis(e.target.value)} className="mt-1">
            <option value="transportasi">Transportasi</option>
            <option value="pemandu">Pemandu</option>
            <option value="sewa_alat">Sewa alat</option>
            <option value="kuliner">Kuliner</option>
          </Select>
        </Field>
        <Field>
          <Label>Harga (Rp)</Label>
          <Input type="number" value={harga} onChange={(e) => setHarga(e.target.value)} className="mt-1" required />
        </Field>
        <ButtonPrimary type="submit">Simpan layanan</ButtonPrimary>
        {pesan && <p className="text-sm text-primary-700 dark:text-primary-300">{pesan}</p>}
      </form>

      <ul className="space-y-3">
        {daftar.map((l) => (
          <li
            key={l.id}
            className="flex flex-col justify-between gap-2 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center dark:border-neutral-700"
          >
            <div>
              <p className="font-medium">{l.nama}</p>
              <p className="text-sm capitalize text-neutral-500">{l.jenis.replace('_', ' ')} · {l.status}</p>
            </div>
            <p className="font-semibold text-primary-700 dark:text-primary-300">
              Rp {l.harga.toLocaleString('id-ID')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
