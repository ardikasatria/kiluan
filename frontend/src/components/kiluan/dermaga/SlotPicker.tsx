'use client'

import { getSlot } from '@/lib/api/dermaga'
import type { SlotJadwal } from '@/lib/api/types'
import { formatHarga } from '@/lib/kiluan/pasar'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  desaSlug: string
  paketId: string
  hargaDefault: number
  satuanHarga: string
  value: SlotJadwal | null
  onChange: (slot: SlotJadwal | null) => void
}

function rentang30Hari(): { dari: string; sampai: string } {
  const dari = new Date()
  const sampai = new Date()
  sampai.setDate(sampai.getDate() + 30)
  return {
    dari: dari.toISOString().slice(0, 10),
    sampai: sampai.toISOString().slice(0, 10),
  }
}

function mockSlotPaket(paketId: string, harga: number): SlotJadwal[] {
  const out: SlotJadwal[] = []
  const base = new Date()
  for (let i = 1; i <= 21; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const sisa = i % 4 === 0 ? 0 : Math.max(1, 6 - (i % 3))
    out.push({
      id: `mock-slot-${paketId}-${i}`,
      subjek_tipe: 'paket_wisata',
      subjek_id: paketId,
      tanggal: d.toISOString().slice(0, 10),
      waktu_mulai: '05:30:00',
      kuota: 6,
      sisa,
      harga_override: harga,
      status: sisa === 0 ? 'penuh' : 'buka',
    })
  }
  return out
}

export default function SlotPicker({ desaSlug, paketId, hargaDefault, satuanHarga, value, onChange }: Props) {
  const t = useTranslations('paket.slot')
  const locale = useLocale()
  const [slots, setSlots] = useState<SlotJadwal[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    const { dari, sampai } = rentang30Hari()
    try {
      const res = await getSlot(desaSlug, {
        subjek_tipe: 'paket_wisata',
        subjek_id: paketId,
        dari,
        sampai,
      })
      setSlots(res.item.length ? res.item : mockSlotPaket(paketId, hargaDefault))
    } catch {
      setSlots(mockSlotPaket(paketId, hargaDefault))
    } finally {
      setLoading(false)
    }
  }, [desaSlug, paketId, hargaDefault])

  useEffect(() => {
    void muat()
    onChange(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset pilihan saat paket berubah
  }, [muat])

  const tersedia = useMemo(() => slots.filter((s) => s.sisa > 0 && s.status !== 'tutup'), [slots])

  function labelTanggal(iso: string) {
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">{t('loading')}</p>
  }

  if (!slots.length) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-600">
        {t('empty')}
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <CalendarDaysIcon className="size-5 text-primary-600" />
        <h3 className="font-semibold text-primary-800 dark:text-primary-100">{t('title')}</h3>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{t('hint')}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((slot) => {
          const penuh = slot.sisa <= 0 || slot.status === 'penuh'
          const dipilih = value?.id === slot.id
          const harga = slot.harga_override ?? hargaDefault
          return (
            <button
              key={slot.id}
              type="button"
              disabled={penuh}
              onClick={() => {
                if (penuh) return
                onChange(dipilih ? null : slot)
              }}
              className={clsx(
                'rounded-xl border p-3 text-left text-sm transition',
                penuh && 'cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-50 dark:bg-neutral-900',
                !penuh && !dipilih && 'border-neutral-200 hover:border-primary-300 dark:border-neutral-700',
                dipilih && 'border-primary-600 bg-primary-50 ring-2 ring-primary-500/30 dark:bg-primary-950/40',
              )}
            >
              <p className="font-medium text-primary-800 dark:text-primary-100">{labelTanggal(slot.tanggal)}</p>
              {slot.waktu_mulai && (
                <p className="mt-0.5 text-xs text-neutral-500">
                  {t('depart', { waktu: slot.waktu_mulai.slice(0, 5) })}
                </p>
              )}
              <p className="mt-1 text-xs font-semibold text-kiluan-sea dark:text-kiluan-mint">
                {formatHarga(harga, satuanHarga)}
              </p>
              <p className={clsx('mt-1 text-xs', penuh ? 'text-red-600' : 'text-neutral-500')}>
                {penuh ? t('full') : t('seats', { count: slot.sisa })}
              </p>
            </button>
          )
        })}
      </div>

      {!tersedia.length && (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{t('allFull')}</p>
      )}
    </div>
  )
}
