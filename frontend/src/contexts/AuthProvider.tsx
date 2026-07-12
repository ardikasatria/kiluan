'use client'

import {
  adalahPengelola,
  bootstrapSesi,
  daftar as apiDaftar,
  keluar as apiKeluar,
  masuk as apiMasuk,
  type DaftarPayload,
  type MasukPayload,
  type ProfilSaya,
} from '@/lib/api/auth'
import { labelPeran, type PeranKode } from '@/lib/kiluan/peran'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export interface AuthUser {
  id: string
  name: string
  email: string
  /** URL foto unggahan; null = tampilkan inisial dari nama */
  avatar: string | null
  role: string
  profil: ProfilSaya
}

interface AuthContextValue {
  isLoggedIn: boolean
  isPengelola: boolean
  isLoading: boolean
  user: AuthUser | null
  masuk: (payload: MasukPayload) => Promise<void>
  daftar: (payload: DaftarPayload) => Promise<string>
  logout: () => Promise<void>
  refreshProfil: () => Promise<void>
  /** @deprecated gunakan masuk() — kompatibilitas sementara */
  login: () => void
  loginAsPengelola: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function labelPeranProfil(profil: ProfilSaya, tPeran: (key: PeranKode | 'anggota') => string): string {
  const aktif = profil.keanggotaan.filter((k) => k.status === 'aktif')
  const pengelola = aktif.find((k) => ['pokdarwis', 'perangkat_desa', 'admin'].includes(k.peran))
  if (pengelola) return labelPeran(pengelola.peran as PeranKode, tPeran)
  const wis = aktif.find((k) => k.peran === 'wisatawan')
  if (wis) return labelPeran('wisatawan', tPeran)
  return tPeran('anggota')
}

function profilKeUser(profil: ProfilSaya, tPeran: (key: PeranKode | 'anggota') => string): AuthUser {
  return {
    id: profil.id,
    name: profil.nama,
    email: profil.email,
    avatar: profil.avatar_url ?? null,
    role: labelPeranProfil(profil, tPeran),
    profil,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const tAuth = useTranslations('auth.errors')
  const tPeran = useTranslations('peran') as unknown as (key: PeranKode | 'anggota') => string
  const [profil, setProfil] = useState<ProfilSaya | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const user = profil ? profilKeUser(profil, tPeran) : null

  const applyProfil = useCallback((next: ProfilSaya | null) => {
    setProfil(next)
  }, [])

  useEffect(() => {
    bootstrapSesi()
      .then(applyProfil)
      .finally(() => setIsLoading(false))
  }, [applyProfil])

  const masuk = useCallback(async (payload: MasukPayload) => {
    await apiMasuk(payload)
    const loaded = await bootstrapSesi()
    if (!loaded) throw new Error(tAuth('profileLoadFailed'))
    applyProfil(loaded)
  }, [applyProfil, tAuth])

  const daftar = useCallback(async (payload: DaftarPayload) => {
    const res = await apiDaftar(payload)
    return res.pesan
  }, [])

  const logout = useCallback(async () => {
    await apiKeluar()
    applyProfil(null)
    router.replace('/')
  }, [applyProfil, router])

  const refreshProfil = useCallback(async () => {
    const loaded = await bootstrapSesi()
    applyProfil(loaded)
  }, [applyProfil])

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!user,
        isPengelola: adalahPengelola(user?.profil ?? null),
        isLoading,
        user,
        masuk,
        daftar,
        logout,
        refreshProfil,
        login: () => {
          console.warn('login() mock deprecated — gunakan masuk({ email, kata_sandi })')
        },
        loginAsPengelola: () => {
          console.warn('loginAsPengelola() mock deprecated — masuk dengan akun pengelola')
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Alias lama — migrasi bertahap */
export const MockAuthProvider = AuthProvider
export function useMockAuth() {
  return useAuth()
}
