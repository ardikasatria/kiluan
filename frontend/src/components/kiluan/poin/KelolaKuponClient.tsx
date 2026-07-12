'use client'

import { pesanGalat } from '@/lib/api/galat'
import { buatKuponKampanye, buatKuponPromoOwner } from '@/lib/api/poin'
import { InformationCircleIcon, TicketIcon } from '@heroicons/react/24/outline'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

interface Props {
  desaSlug: string
  mode: 'kampanye' | 'promo_owner'
}

export default function KelolaKuponClient({ desaSlug, mode }: Props) {
  const t = useTranslations('kelola.kupon')
  const locale = useLocale() as 'id' | 'en'
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  async function simpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const tingkat = String(fd.get('tingkat') || '')
    const penyedia = String(fd.get('penyedia') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `umkm:${item}`)
    const pembatas = [
      ...(tingkat ? [`tingkat:${tingkat}`] : []),
      ...penyedia,
    ]
    const mulai = String(fd.get('mulai') || '')
    const sampai = String(fd.get('sampai') || '')
    const payload = {
      kode: String(fd.get('kode')).trim().toUpperCase(),
      tipe_diskon: String(fd.get('tipe')) as 'persen' | 'nominal',
      nilai: Number(fd.get('nilai')),
      min_belanja: fd.get('min') ? Number(fd.get('min')) : undefined,
      batas_pakai: fd.get('batas') ? Number(fd.get('batas')) : 100,
      penyedia_terbatas: pembatas.length ? pembatas : undefined,
      berlaku_mulai: mulai ? new Date(mulai).toISOString() : undefined,
      berlaku_sampai: sampai ? new Date(sampai).toISOString() : undefined,
    }

    setMenyimpan(true)
    setGalat(null)
    setSukses(null)
    try {
      if (mode === 'promo_owner') {
        await buatKuponPromoOwner(desaSlug, payload)
      } else {
        await buatKuponKampanye(desaSlug, payload)
      }
      form.reset()
      setSukses(t(`success.${mode}`))
    } catch (err) {
      setGalat(pesanGalat(err, locale))
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <div className="space-y-6">
      {mode === 'promo_owner' ? (
        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/70 dark:bg-amber-950/30">
          <div className="flex gap-3">
            <InformationCircleIcon className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <div>
              <h2 className="font-semibold text-amber-900 dark:text-amber-100">{t('ownerCostTitle')}</h2>
              <p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-200">{t('ownerCostBody')}</p>
            </div>
          </div>
        </aside>
      ) : (
        <aside className="rounded-2xl border border-primary-200 bg-primary-50 p-5 dark:border-primary-800 dark:bg-primary-950/40">
          <div className="flex gap-3">
            <InformationCircleIcon className="mt-0.5 size-5 shrink-0 text-primary-700 dark:text-primary-300" aria-hidden />
            <div>
              <h2 className="font-semibold text-primary-900 dark:text-primary-100">{t('campaignTitle')}</h2>
              <p className="mt-1 text-sm leading-relaxed text-primary-800 dark:text-primary-200">{t('campaignBody')}</p>
            </div>
          </div>
        </aside>
      )}

      {galat && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{galat}</p>}
      {sukses && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{sukses}</p>}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-200">
            <TicketIcon className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-semibold text-primary-800 dark:text-primary-100">{t(`formTitle.${mode}`)}</h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('formHint')}</p>
          </div>
        </div>

        <form onSubmit={(e) => void simpan(e)} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.kode')}
            <input name="kode" required pattern="[A-Za-z0-9_-]{3,32}" placeholder="LESTARI25" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 font-mono text-sm uppercase dark:border-neutral-600 dark:bg-neutral-950" />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.tipe')}
            <select name="tipe" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950">
              <option value="persen">{t('type.persen')}</option>
              <option value="nominal">{t('type.nominal')}</option>
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.nilai')}
            <input name="nilai" type="number" min={1} required placeholder="10" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950" />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.min')}
            <input name="min" type="number" min={0} placeholder="50000" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950" />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.batas')}
            <input name="batas" type="number" min={1} defaultValue={100} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950" />
          </label>
          <div className="hidden sm:block" />
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.mulai')}
            <input name="mulai" type="datetime-local" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:[color-scheme:dark]" />
          </label>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('field.sampai')}
            <input name="sampai" type="datetime-local" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:[color-scheme:dark]" />
          </label>

          <fieldset className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700 sm:col-span-2">
            <legend className="px-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('provider.title')}</legend>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{t('provider.hint')}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('provider.level')}
                <select name="tingkat" className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950">
                  <option value="">{t('provider.all')}</option>
                  <option value="tunas">{t('level.tunas')}</option>
                  <option value="bahari">{t('level.bahari')}</option>
                  <option value="lumba_lumba">{t('level.lumba_lumba')}</option>
                </select>
              </label>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('provider.ids')}
                <input name="penyedia" placeholder={t('provider.idsPlaceholder')} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-950" />
              </label>
            </div>
            <p className="mt-3 text-xs font-medium text-primary-700 dark:text-primary-300">{t('provider.flywheel')}</p>
          </fieldset>

          <button type="submit" disabled={menyimpan} className="rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:cursor-wait disabled:opacity-60 sm:col-span-2 sm:w-fit dark:bg-primary-600 dark:hover:bg-primary-500">
            {menyimpan ? t('saving') : t(`submit.${mode}`)}
          </button>
        </form>
      </section>
    </div>
  )
}
