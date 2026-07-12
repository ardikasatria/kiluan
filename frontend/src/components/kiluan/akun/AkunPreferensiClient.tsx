'use client'

import { ThemeContext } from '@/app/theme-provider'
import KiluanAvatar from '@/components/kiluan/KiluanAvatar'
import PwaInstallButton from '@/components/kiluan/PwaInstallButton'
import { useAuth } from '@/contexts/AuthProvider'
import { patchProfilSaya } from '@/lib/api/auth'
import { pesanGalat } from '@/lib/api/galat'
import { ajukanKeanggotaan } from '@/lib/api/keanggotaan'
import { konfirmasiMedia, presignMedia, unggahKeMinio } from '@/lib/api/media'
import {
  bacaPrefsLokal,
  MINAT_PILIHAN,
  simpanPrefsLokal,
  type NotifikasiPrefs,
  type PrefsLokal,
} from '@/lib/kiluan/prefs-lokal'
import {
  labelPeran,
  statusKeanggotaan,
  type PeranKode,
} from '@/lib/kiluan/peran'
import { DEFAULT_DESA_SLUG } from '@/contexts/DesaKonteksProvider'
import { RUTE_DASBOR, RUTE_WISATAWAN } from '@/lib/kiluan/rute-sigerciv'
import { Button } from '@/shared/Button'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Switch, SwitchField } from '@/shared/switch'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'

export type BagianAkun =
  | 'profil'
  | 'minat'
  | 'keamanan'
  | 'keanggotaan'
  | 'notifikasi'
  | 'tampilan'
  | 'privasi'
  | 'bantuan'

interface Props {
  desaSlug?: string
  desaNama?: string
  lintasDesa?: boolean
}

const NAV: { id: BagianAkun; label: string; grup?: string }[] = [
  { id: 'profil', label: 'Informasi personal', grup: 'Akun' },
  { id: 'minat', label: 'Minat & personalisasi', grup: 'Akun' },
  { id: 'keamanan', label: 'Keamanan', grup: 'Konfigurasi' },
  { id: 'keanggotaan', label: 'Keanggotaan & peran', grup: 'Konfigurasi' },
  { id: 'notifikasi', label: 'Notifikasi', grup: 'Konfigurasi' },
  { id: 'tampilan', label: 'Tampilan', grup: 'Konfigurasi' },
  { id: 'privasi', label: 'Privasi & data', grup: 'Konfigurasi' },
  { id: 'bantuan', label: 'Panduan & PWA', grup: 'Konfigurasi' },
]

const PERAN_AJUAN: PeranKode[] = ['umkm', 'agen', 'kontributor', 'pokdarwis', 'organisasi']

function BadgeSegera({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:bg-amber-900/40 dark:text-amber-200',
        className,
      )}
    >
      segera
    </span>
  )
}

function Kartu({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={clsx(
        'rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-700/80 dark:bg-neutral-900/60',
        className,
      )}
    >
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function LabelField({
  htmlFor,
  label,
  hint,
  children,
  className,
}: {
  htmlFor?: string
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
    </div>
  )
}

function StatusKeanggotaanBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aktif: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    menunggu: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    ditolak: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    nonaktif: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  }
  return (
    <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', map[status] ?? map.nonaktif)}>
      {status}
    </span>
  )
}

export default function AkunPreferensiClient({ desaSlug, desaNama, lintasDesa = false }: Props) {
  const { user, refreshProfil } = useAuth()
  const theme = useContext(ThemeContext)
  const [bagian, setBagian] = useState<BagianAkun>('profil')
  const [prefs, setPrefs] = useState<PrefsLokal>(bacaPrefsLokal)
  const [nama, setNama] = useState('')
  const [telepon, setTelepon] = useState('')
  const [bio, setBio] = useState('')
  const [simpanProfil, setSimpanProfil] = useState(false)
  const [unggahAvatar, setUnggahAvatar] = useState(false)
  const [pctUnggah, setPctUnggah] = useState(0)
  const [pesanSukses, setPesanSukses] = useState<string | null>(null)
  const [pesanError, setPesanError] = useState<string | null>(null)
  const [peranAjuan, setPeranAjuan] = useState<PeranKode>('umkm')
  const [ajukanLoading, setAjukanLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const consentId = useId()

  useEffect(() => {
    if (!user) return
    setNama(user.name)
    setTelepon(user.profil.telepon ?? '')
    setPrefs(bacaPrefsLokal())
    setBio(bacaPrefsLokal().bio)
  }, [user])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as BagianAkun
    if (NAV.some((n) => n.id === hash)) setBagian(hash)
  }, [])

  const bersihkanPesan = useCallback(() => {
    setPesanSukses(null)
    setPesanError(null)
  }, [])

  async function handleSimpanProfil() {
    if (!user) return
    bersihkanPesan()
    setSimpanProfil(true)
    const namaLama = user.name
    const teleponLama = user.profil.telepon ?? ''
    try {
      await patchProfilSaya({
        nama: nama.trim(),
        telepon: telepon.trim() || undefined,
      })
      simpanPrefsLokal({ bio: bio.trim() })
      setPrefs(bacaPrefsLokal())
      await refreshProfil()
      setPesanSukses('Profil berhasil disimpan.')
    } catch (err) {
      setNama(namaLama)
      setTelepon(teleponLama)
      setPesanError(pesanGalat(err))
    } finally {
      setSimpanProfil(false)
    }
  }

  async function handleAvatar(file: File) {
    if (!user) return
    bersihkanPesan()
    setUnggahAvatar(true)
    setPctUnggah(0)
    try {
      const presign = await presignMedia(slugMedia, file)
      await unggahKeMinio(presign.url_unggah, file, setPctUnggah)
      await konfirmasiMedia(slugMedia, {
        media_id: presign.media_id,
        tipe: 'foto',
        alt: `Avatar ${user.name}`,
      })
      await patchProfilSaya({ avatar_media_id: presign.media_id })
      await refreshProfil()
      setPesanSukses('Avatar diperbarui.')
    } catch (err) {
      setPesanError(pesanGalat(err))
    } finally {
      setUnggahAvatar(false)
      setPctUnggah(0)
    }
  }

  function updatePrefs(ubah: Partial<PrefsLokal>) {
    const berikut = simpanPrefsLokal(ubah)
    setPrefs(berikut)
    setPesanSukses('Disimpan di perangkat ini. Sinkron ke akun — segera.')
  }

  function updateNotifikasi(kunci: keyof NotifikasiPrefs, nilai: boolean) {
    updatePrefs({ notifikasi: { ...prefs.notifikasi, [kunci]: nilai } })
  }

  async function handleAjukanPeran() {
    if (!desaSlug) return
    bersihkanPesan()
    setAjukanLoading(true)
    try {
      const res = await ajukanKeanggotaan(desaSlug, peranAjuan)
      await refreshProfil()
      setPesanSukses(`Pengajuan peran ${labelPeran(peranAjuan)} dikirim — status: ${res.status}.`)
    } catch (err) {
      setPesanError(pesanGalat(err))
    } finally {
      setAjukanLoading(false)
    }
  }

  function toggleMinat(id: string) {
    const ada = prefs.minat.includes(id)
    const minat = ada ? prefs.minat.filter((m) => m !== id) : [...prefs.minat, id]
    updatePrefs({ minat })
  }

  if (!user) return null

  const slugMedia = desaSlug ?? DEFAULT_DESA_SLUG
  const dasborHref = lintasDesa ? RUTE_DASBOR : `/${desaSlug}/dasbor`
  const emailTerverifikasi = user.profil.email_terverifikasi ?? user.profil.status === 'aktif'

  return (
    <div className="pb-20">
      {/* Hero */}
      <div className="border-b border-neutral-200 bg-gradient-to-br from-primary-800 via-primary-700 to-kiluan-teal text-white dark:from-primary-950 dark:via-primary-900 dark:to-primary-800">
        <div className="container py-10 sm:py-12">
          <Link
            href={dasborHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-100 hover:text-white"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Dasbor
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <KiluanAvatar nama={user.name} src={user.avatar} width={72} height={72} className="size-[4.5rem] ring-2 ring-white/30" />
            <div>
              <p className="text-sm font-medium text-primary-100/90">Sigerciv</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Akun & Preferensi</h1>
              <p className="mt-1 text-sm text-primary-50/90">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        {(pesanSukses || pesanError) && (
          <div
            role="status"
            className={clsx(
              'mb-6 rounded-xl border px-4 py-3 text-sm',
              pesanError
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
            )}
          >
            {pesanError ?? pesanSukses}
          </div>
        )}

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* Nav kiri */}
          <nav
            aria-label="Bagian akun"
            className="lg:w-56 lg:shrink-0"
          >
            {/* Mobile tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setBagian(item.id); bersihkanPesan() }}
                  className={clsx(
                    'shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition',
                    bagian === item.id
                      ? 'bg-primary-700 text-white dark:bg-primary-600'
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Desktop sidebar */}
            <ul className="hidden space-y-1 lg:block">
              {NAV.map((item, i) => {
                const tampilGrup = item.grup && (i === 0 || NAV[i - 1]?.grup !== item.grup)
                return (
                  <li key={item.id}>
                    {tampilGrup ? (
                      <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                        {item.grup}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => { setBagian(item.id); bersihkanPesan() }}
                      aria-current={bagian === item.id ? 'page' : undefined}
                      className={clsx(
                        'w-full rounded-xl px-3 py-2.5 text-start text-sm font-medium transition',
                        bagian === item.id
                          ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/50 dark:text-primary-100'
                          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/80',
                      )}
                    >
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Konten */}
          <div className="min-w-0 flex-1 space-y-6">
            {bagian === 'profil' && (
              <>
                <Kartu title="Foto profil" description="Tampil di komentar, leaderboard, dan menu pengguna.">
                  <div className="flex flex-wrap items-center gap-5">
                    <div className="relative">
                      <KiluanAvatar nama={user.name} src={user.avatar} width={96} height={96} className="size-24" />
                      {unggahAvatar && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-medium text-white">
                          {pctUnggah}%
                        </span>
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void handleAvatar(f)
                          e.target.value = ''
                        }}
                      />
                      <Button
                        type="button"
                        outline
                        onClick={() => fileRef.current?.click()}
                        disabled={unggahAvatar}
                        className="inline-flex items-center gap-2"
                      >
                        <CameraIcon className="size-4" aria-hidden />
                        {unggahAvatar ? 'Mengunggah…' : 'Ganti foto'}
                      </Button>
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">JPG, PNG, atau WebP. Maks. 5 MB.</p>
                    </div>
                  </div>
                </Kartu>

                <Kartu title="Data diri" description="Nama dan telepon disimpan ke akun Sigerciv Anda.">
                  <div className="space-y-4">
                    <LabelField htmlFor="akun-nama" label="Nama lengkap">
                      <Input id="akun-nama" value={nama} onChange={(e) => setNama(e.target.value)} rounded="rounded-xl" />
                    </LabelField>
                    <LabelField htmlFor="akun-telepon" label="Nomor telepon" hint="Opsional. Untuk koordinasi booking & misi.">
                      <Input id="akun-telepon" type="tel" value={telepon} onChange={(e) => setTelepon(e.target.value)} rounded="rounded-xl" />
                    </LabelField>
                    <LabelField htmlFor="akun-bio" label="Bio singkat" hint="Disimpan sementara di perangkat — sinkron akun segera.">
                      <Textarea
                        id="akun-bio"
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        placeholder="Ceritakan minat wisata regeneratif Anda…"
                      />
                    </LabelField>
                    <Button color="primary" onClick={() => void handleSimpanProfil()} disabled={simpanProfil}>
                      {simpanProfil ? 'Menyimpan…' : 'Simpan perubahan'}
                    </Button>
                  </div>
                </Kartu>

                <Kartu title="Email" description="Alamat login Anda.">
                  <div className="flex flex-wrap items-center gap-3">
                    <Input value={user.email} readOnly rounded="rounded-xl" className="max-w-md opacity-80" />
                    {emailTerverifikasi ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                        <CheckCircleIcon className="size-4" aria-hidden />
                        Terverifikasi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
                        <ClockIcon className="size-4" aria-hidden />
                        Belum terverifikasi
                      </span>
                    )}
                  </div>
                  <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Ubah email membutuhkan verifikasi ulang.
                    <BadgeSegera />
                    <Link href="/masuk" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                      Hubungi admin desa
                    </Link>
                  </p>
                </Kartu>
              </>
            )}

            {bagian === 'minat' && (
              <Kartu
                title="Minat & personalisasi"
                description="Dasar rekomendasi Pemandu AI — data milik komunitas, bisa dicabut kapan saja."
              >
                <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
                  Pilih aktivitas favorit. Penyimpanan ke akun — <BadgeSegera className="align-middle" /> (sementara di perangkat ini).
                </p>
                <div className="flex flex-wrap gap-2">
                  {MINAT_PILIHAN.map((m) => {
                    const aktif = prefs.minat.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMinat(m.id)}
                        aria-pressed={aktif}
                        className={clsx(
                          'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                          aktif
                            ? 'border-primary-400 bg-primary-50 text-primary-800 dark:border-primary-600 dark:bg-primary-900/50 dark:text-primary-100'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                        )}
                      >
                        <span aria-hidden>{m.ikon}</span>
                        {m.label}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
                  <div className="flex items-start gap-3">
                    <input
                      id={consentId}
                      type="checkbox"
                      checked={prefs.consent_personalisasi}
                      onChange={(e) => updatePrefs({ consent_personalisasi: e.target.checked })}
                      className="mt-1 size-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600"
                    />
                    <label htmlFor={consentId} className="text-sm text-neutral-700 dark:text-neutral-300">
                      <span className="font-medium">Gunakan aktivitas saya untuk personalisasi</span>
                      <span className="mt-1 block text-neutral-500 dark:text-neutral-400">
                        Rekomendasi paket, misi, dan kurasi disesuaikan dari minat yang Anda pilih. Cabut centang untuk menonaktifkan.
                      </span>
                    </label>
                  </div>
                </div>
              </Kartu>
            )}

            {bagian === 'keamanan' && (
              <>
                <Kartu title="Kata sandi">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Ubah sandi saat sudah masuk belum tersedia di API.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button href="/lupa-sandi" outline>
                      Atur ulang via email
                    </Button>
                    <span className="inline-flex items-center gap-2 self-center text-sm text-neutral-500">
                      Ubah sandi langsung <BadgeSegera />
                    </span>
                  </div>
                </Kartu>

                <Kartu title="Sesi & perangkat">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Keluar dari semua perangkat akan mencabut sesi refresh. Daftar perangkat aktif —
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button outline onClick={() => void refreshProfil()}>
                      <ArrowPathIcon className="size-4" aria-hidden />
                      Segarkan sesi
                    </Button>
                    <BadgeSegera />
                  </div>
                </Kartu>
              </>
            )}

            {bagian === 'keanggotaan' && (
              <>
                <Kartu title="Peran Anda" description={`Keanggotaan lintas desa di jaringan Sigerciv.`}>
                  <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {user.profil.keanggotaan.map((k, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {labelPeran(k.peran as PeranKode)}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {k.desa_id ? (lintasDesa ? 'Desa keanggotaan' : desaNama) : 'Sigerciv (global)'}
                          </p>
                        </div>
                        <StatusKeanggotaanBadge status={k.status} />
                      </li>
                    ))}
                  </ul>
                </Kartu>

                {!lintasDesa && desaSlug ? (
                  <Kartu title="Gabung komunitas desa" description={`Ajukan peran baru di ${desaNama}.`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <LabelField htmlFor="peran-ajuan" label="Peran yang diajukan" className="flex-1">
                        <select
                          id="peran-ajuan"
                          value={peranAjuan}
                          onChange={(e) => setPeranAjuan(e.target.value as PeranKode)}
                          className="block w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        >
                          {PERAN_AJUAN.map((p) => (
                            <option key={p} value={p} disabled={statusKeanggotaan(user.profil, p) === 'aktif' || statusKeanggotaan(user.profil, p) === 'menunggu'}>
                              {labelPeran(p)}
                              {statusKeanggotaan(user.profil, p) === 'menunggu' ? ' (menunggu)' : ''}
                            </option>
                          ))}
                        </select>
                      </LabelField>
                      <Button color="primary" onClick={() => void handleAjukanPeran()} disabled={ajukanLoading}>
                        {ajukanLoading ? 'Mengirim…' : 'Ajukan peran'}
                      </Button>
                    </div>
                    <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                      Pengajuan ditinjau Pokdarwis atau perangkat desa. Anda akan mendapat notifikasi saat disetujui.
                    </p>
                  </Kartu>
                ) : (
                  <Kartu
                    title="Gabung komunitas desa"
                    description="Untuk mengajukan peran UMKM, agen, kontributor, atau Pokdarwis, kunjungi halaman desa wisata yang Anda minati."
                  >
                    <Link
                      href={RUTE_WISATAWAN.discovery}
                      className="inline-flex text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Jelajah desa wisata di Lampung →
                    </Link>
                  </Kartu>
                )}
              </>
            )}

            {bagian === 'notifikasi' && (
              <Kartu title="Preferensi notifikasi" description="Push via PWA (Android/desktop; iOS 16.4+). Sinkron ke akun — segera.">
                <p className="mb-5 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                  <ExclamationTriangleIcon className="size-4 shrink-0" aria-hidden />
                  Disimpan di perangkat ini sampai endpoint preferensi tersedia.
                </p>
                <div className="space-y-6">
                  {(
                    [
                      ['email_misi', 'Email — misi & kontribusi'],
                      ['email_pesanan', 'Email — pesanan & booking'],
                      ['email_kurasi', 'Email — kurasi & berita'],
                      ['push_misi', 'Push — misi & kontribusi'],
                      ['push_pesanan', 'Push — pesanan & booking'],
                      ['push_kurasi', 'Push — kurasi & berita'],
                    ] as const
                  ).map(([kunci, label]) => (
                    <SwitchField key={kunci}>
                      <span data-slot="label" className="text-sm text-neutral-800 dark:text-neutral-200">
                        {label}
                      </span>
                      <Switch
                        color="emerald"
                        checked={prefs.notifikasi[kunci]}
                        onChange={(v) => updateNotifikasi(kunci, v)}
                      />
                    </SwitchField>
                  ))}
                </div>
              </Kartu>
            )}

            {bagian === 'tampilan' && (
              <Kartu title="Tampilan" description="Bahasa dan tema disimpan di perangkat. Sinkron akun — segera.">
                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Mode tampilan</p>
                    <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                      <button
                        type="button"
                        onClick={() => theme?.setDarkMode(false)}
                        className={clsx(
                          'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition',
                          !theme?.isDarkMode
                            ? 'border-primary-400 bg-primary-50 text-primary-800 dark:border-primary-500 dark:bg-primary-900/50 dark:text-primary-100'
                            : 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                        )}
                      >
                        <SunIcon className="size-5" aria-hidden />
                        Terang
                      </button>
                      <button
                        type="button"
                        onClick={() => theme?.setDarkMode(true)}
                        className={clsx(
                          'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition',
                          theme?.isDarkMode
                            ? 'border-primary-400 bg-primary-50 text-primary-800 dark:border-primary-500 dark:bg-primary-900/50 dark:text-primary-100'
                            : 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                        )}
                      >
                        <MoonIcon className="size-5" aria-hidden />
                        Gelap
                      </button>
                    </div>
                  </div>

                  <LabelField htmlFor="bahasa" label="Bahasa">
                    <select
                      id="bahasa"
                      value={prefs.bahasa}
                      onChange={(e) => updatePrefs({ bahasa: e.target.value as 'id' | 'en' })}
                      className="block w-full max-w-xs rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en" disabled>
                        English (segera)
                      </option>
                    </select>
                  </LabelField>
                </div>
              </Kartu>
            )}

            {bagian === 'privasi' && (
              <>
                <Kartu title="Data pribadi" description="Prinsip kepemilikan komunitas — data Anda, kendali Anda.">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Unduh data pribadi</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Ekspor profil, kontribusi, dan riwayat poin.</p>
                      </div>
                      <BadgeSegera />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200/80 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-200">Hapus akun</p>
                        <p className="text-sm text-red-700/80 dark:text-red-300/80">Permanen — membutuhkan konfirmasi admin.</p>
                      </div>
                      <BadgeSegera />
                    </div>
                  </div>
                </Kartu>

                <Kartu title="Izin lokasi">
                  <SwitchField>
                    <span data-slot="label" className="text-sm text-neutral-800 dark:text-neutral-200">
                      Izinkan akses lokasi untuk peta & misi terdekat
                    </span>
                    <Switch
                      color="emerald"
                      checked={prefs.izin_lokasi}
                      onChange={(v) => {
                        if (v && typeof navigator !== 'undefined' && navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            () => updatePrefs({ izin_lokasi: true }),
                            () => updatePrefs({ izin_lokasi: false }),
                          )
                        } else {
                          updatePrefs({ izin_lokasi: v })
                        }
                      }}
                    />
                  </SwitchField>
                </Kartu>
              </>
            )}

            {bagian === 'bantuan' && (
              <>
                <Kartu title="Pasang aplikasi (PWA)" description="Akses cepat dari layar utama — berfungsi offline terbatas.">
                  <PwaInstallButton variant="footer" className="!inline-flex" />
                  <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                    Tombol muncul otomatis bila browser mendukung instalasi. Cache offline dikelola browser.
                  </p>
                </Kartu>

                <Kartu title="Panduan & etik">
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link href={RUTE_WISATAWAN.discovery} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                        Jelajah desa wisata Lampung
                      </Link>
                    </li>
                    {desaSlug && !lintasDesa ? (
                      <>
                        <li>
                          <Link href={`/${desaSlug}/berita`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                            Berita & pengumuman desa
                          </Link>
                        </li>
                        <li>
                          <Link href={`/${desaSlug}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                            Kode etik wisata regeneratif
                          </Link>
                          <span className="ms-2 text-neutral-400">— di halaman desa</span>
                        </li>
                      </>
                    ) : null}
                    <li>
                      <a href="mailto:admin@sigerciv.com" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                        Hubungi tim Sigerciv
                      </a>
                    </li>
                  </ul>
                </Kartu>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
