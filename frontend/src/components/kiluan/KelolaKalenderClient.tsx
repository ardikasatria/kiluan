'use client'

import { getKalenderDesa } from '@/lib/api/destinasi'
import type { KalenderItem } from '@/lib/api/types'
import { tambahAntrean } from '@/lib/offline/db'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { FormEvent, useEffect, useState } from 'react'

interface Props {
  desaSlug: string
  awal: KalenderItem[]
}

export default function KelolaKalenderClient({ desaSlug, awal }: Props) {
  const [daftar, setDaftar] = useState(awal)
  const [judul, setJudul] = useState('')
  const [tipe, setTipe] = useState('harian')
  const [mulai, setMulai] = useState('05:30')
  const [selesai, setSelesai] = useState('07:00')
  const [freq, setFreq] = useState('DAILY')
  const [pesan, setPesan] = useState<string | null>(null)

  useEffect(() => {
    getKalenderDesa(desaSlug).then(setDaftar).catch(() => {})
  }, [desaSlug])

  const tambah = async (e: FormEvent) => {
    e.preventDefault()
    const body = {
      judul,
      tipe,
      waktu_mulai: mulai,
      waktu_selesai: selesai,
      pengulangan: { freq },
      berlaku_mulai: new Date().toISOString().slice(0, 10),
      status: 'aktif',
    }
    if (!navigator.onLine) {
      await tambahAntrean({
        desaSlug,
        method: 'POST',
        path: `/api/v1/desa/${desaSlug}/kalender`,
        body: JSON.stringify(body),
      })
      setPesan('Disimpan ke antrean offline.')
      return
    }
    setPesan('Aktivitas ditambahkan (mock/demo jika API offline).')
    setDaftar((d) => [
      ...d,
      {
        id: `local-${Date.now()}`,
        judul,
        tipe,
        waktu_mulai: mulai,
        waktu_selesai: selesai,
        pengulangan: { freq },
        berlaku_mulai: body.berlaku_mulai,
        status: 'aktif',
      },
    ])
    setJudul('')
  }

  return (
    <div className="space-y-8">
      <form onSubmit={tambah} className="max-w-xl space-y-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700 dark:bg-neutral-800/40">
        <h3 className="font-semibold text-primary-800 dark:text-primary-100">Tambah aktivitas kalender</h3>
        <Field>
          <Label>Judul</Label>
          <Input value={judul} onChange={(e) => setJudul(e.target.value)} className="mt-1" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label>Tipe</Label>
            <Select value={tipe} onChange={(e) => setTipe(e.target.value)} className="mt-1">
              <option value="harian">Harian</option>
              <option value="musiman">Musiman</option>
              <option value="event">Event</option>
            </Select>
          </Field>
          <Field>
            <Label>Pengulangan (RRULE)</Label>
            <Select value={freq} onChange={(e) => setFreq(e.target.value)} className="mt-1">
              <option value="DAILY">Setiap hari</option>
              <option value="WEEKLY">Mingguan</option>
            </Select>
          </Field>
          <Field>
            <Label>Mulai</Label>
            <Input type="time" value={mulai} onChange={(e) => setMulai(e.target.value)} className="mt-1" />
          </Field>
          <Field>
            <Label>Selesai</Label>
            <Input type="time" value={selesai} onChange={(e) => setSelesai(e.target.value)} className="mt-1" />
          </Field>
        </div>
        <ButtonPrimary type="submit">Simpan aktivitas</ButtonPrimary>
        {pesan && <p className="text-sm text-primary-700 dark:text-primary-300">{pesan}</p>}
      </form>

      <ul className="space-y-3">
        {daftar.map((k) => (
          <li key={k.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <p className="font-medium">{k.judul}</p>
            <p className="text-sm text-neutral-500">
              {k.waktu_mulai} – {k.waktu_selesai} · {k.tipe}
              {k.pengulangan && typeof k.pengulangan === 'object' && 'freq' in k.pengulangan
                ? ` · ${String((k.pengulangan as { freq: string }).freq)}`
                : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
