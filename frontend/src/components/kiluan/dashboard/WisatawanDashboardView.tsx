'use client'

import RoleDashboardView from '@/components/kiluan/dashboard/RoleDashboardView'
import type { AktivitasDasborItem } from '@/components/kiluan/dashboard/DashboardActivity'
import type { DashboardPeranConfig, DashboardWidget } from '@/lib/kiluan/dashboard-peran'
import {
  ambilDataDasborWisatawanLintas,
  labelTipeSimpanan,
  type EventAktivitasWisatawan,
} from '@/lib/kiluan/wisatawan-stats'
import { useAuth } from '@/contexts/AuthProvider'
import type { Locale } from '@/i18n/routing'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

interface Props {
  config: DashboardPeranConfig
  desaPilot?: string
}

function formatEvent(
  ev: EventAktivitasWisatawan,
  t: ReturnType<typeof useTranslations<'dasbor.wisatawan.aktivitasFeed'>>,
  tKontrib: ReturnType<typeof useTranslations<'kontribusi.status'>>,
  tPesanan: ReturnType<typeof useTranslations<'pesanan.status'>>,
  locale: Locale,
): AktivitasDasborItem {
  let label = ''

  switch (ev.jenis) {
    case 'simpanan':
      label = t('simpanan', {
        nama: ev.meta.nama ?? '—',
        tipe: labelTipeSimpanan(ev.meta.tipe as 'destinasi' | 'paket' | 'misi' | 'produk', locale),
        desa: ev.meta.desa ?? '',
      })
      break
    case 'kontribusi': {
      const statusKey = ev.meta.status as 'menunggu' | 'disetujui' | 'ditolak' | 'revisi'
      const statusLabel = ['menunggu', 'disetujui', 'ditolak', 'revisi'].includes(statusKey)
        ? tKontrib(statusKey)
        : ev.meta.status
      label = t('kontribusi', { tipe: ev.meta.tipe, status: statusLabel })
      break
    }
    case 'stempel':
      label = t('stempel', {
        misi: ev.meta.misi ?? '—',
        status: ev.meta.status === 'terverifikasi' ? t('stempelTerverifikasi') : t('stempelMenunggu'),
      })
      break
    case 'pesanan': {
      const statusKey = ev.meta.status as
        | 'menunggu_pembayaran'
        | 'dibayar'
        | 'diproses'
        | 'selesai'
        | 'dibatalkan'
        | 'kedaluwarsa'
        | 'refund_diajukan'
      const statusLabel = [
        'menunggu_pembayaran',
        'dibayar',
        'diproses',
        'selesai',
        'dibatalkan',
        'kedaluwarsa',
        'refund_diajukan',
      ].includes(statusKey)
        ? tPesanan(statusKey)
        : ev.meta.status.replace(/_/g, ' ')
      label = t('pesanan', { kode: ev.meta.kode, status: statusLabel })
      break
    }
  }

  return { id: ev.id, label, href: ev.href, waktu: ev.waktu }
}

export default function WisatawanDashboardView({ config, desaPilot = 'teluk-kiluan' }: Props) {
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const locale = useLocale() as Locale
  const tFeed = useTranslations('dasbor.wisatawan.aktivitasFeed')
  const tWidget = useTranslations('dasbor.wisatawan.widgets')
  const tKontrib = useTranslations('kontribusi.status')
  const tPesanan = useTranslations('pesanan.status')

  const [statsOverride, setStatsOverride] = useState<Partial<Record<string, string | number>> | undefined>()
  const [widgetsOverride, setWidgetsOverride] = useState<Partial<Record<string, Partial<DashboardWidget>>> | undefined>()
  const [aktivitas, setAktivitas] = useState<AktivitasDasborItem[] | undefined>()
  const [memuat, setMemuat] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) {
      setStatsOverride({ wishlist: 0, stempel: 0, kontrib: 0, poin: 0 })
      setWidgetsOverride(undefined)
      setAktivitas([])
      setMemuat(false)
      return
    }

    let batal = false
    setMemuat(true)

    ambilDataDasborWisatawanLintas(desaPilot)
      .then((data) => {
        if (batal) return

        setStatsOverride(data.stats)
        setAktivitas(data.events.map((ev) => formatEvent(ev, tFeed, tKontrib, tPesanan, locale)))

        const pesananHref = `/${data.pesanan.desaSlug}/pesanan`
        setWidgetsOverride({
          booking: {
            segera: false,
            href: pesananHref,
            description:
              data.pesanan.total > 0
                ? data.pesanan.aktif > 0
                  ? tWidget('bookingDescAktif', {
                      total: data.pesanan.total,
                      aktif: data.pesanan.aktif,
                    })
                  : tWidget('bookingDescTotal', { total: data.pesanan.total })
                : tWidget('bookingDescKosong'),
          },
          poin: {
            segera: false,
            href: `/${desaPilot}/saya/lencana`,
            description:
              data.stats.poin > 0
                ? tWidget('poinDescSaldo', { poin: data.stats.poin })
                : tWidget('poinDesc'),
          },
        })
      })
      .catch(() => {
        if (batal) return
        setStatsOverride({ wishlist: 0, stempel: 0, kontrib: 0, poin: 0 })
        setAktivitas([])
      })
      .finally(() => {
        if (!batal) setMemuat(false)
      })

    return () => {
      batal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat ulang saat sesi/desa berubah
  }, [authLoading, isLoggedIn, desaPilot, locale])

  const tampilanStats = useMemo(
    () =>
      memuat
        ? { wishlist: '…', stempel: '…', kontrib: '…', poin: '…' }
        : statsOverride,
    [memuat, statsOverride],
  )

  return (
    <RoleDashboardView
      desaSlug="sigerciv"
      desaNama="Sigerciv · Lampung"
      config={config}
      statsOverride={tampilanStats}
      widgetsOverride={widgetsOverride}
      aktivitas={aktivitas}
      aktivitasKosong={tFeed('kosong')}
      aktivitasTanpaCatatan={!memuat && (aktivitas?.length ?? 0) > 0}
      lintasDesa
    />
  )
}
