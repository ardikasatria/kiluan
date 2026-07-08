'use client'

import { hitungAntrean } from '@/lib/offline/db'
import { prosesAntreanSinkron } from '@/lib/offline/sync'
import { CloudArrowUpIcon, SignalSlashIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

interface Props {
  desaSlug?: string
}

export default function OfflineIndicator({ desaSlug }: Props) {
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const refresh = async () => {
      setOnline(navigator.onLine)
      setPending(await hitungAntrean(desaSlug))
    }
    refresh()
    const onOnline = async () => {
      setOnline(true)
      await prosesAntreanSinkron()
      setPending(await hitungAntrean(desaSlug))
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [desaSlug])

  if (online && pending === 0) return null

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
        online
          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200'
          : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
      }`}
    >
      {online ? <CloudArrowUpIcon className="size-4" /> : <SignalSlashIcon className="size-4" />}
      {online ? `${pending} perubahan menunggu sinkron` : 'Offline — perubahan disimpan lokal'}
    </div>
  )
}
