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
import { pesanGalat } from '@/lib/api/galat'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const AVATAR_DEFAULT =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&auto=format&fit=crop'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string
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

function labelPeran(profil: ProfilSaya): string {
  const aktif = profil.keanggotaan.filter((k) => k.status === 'aktif')
  const pengelola = aktif.find((k) => ['pokdarwis', 'perangkat_desa', 'admin'].includes(k.peran))
  if (pengelola) return pengelola.peran.replace('_', ' ')
  const wis = aktif.find((k) => k.peran === 'wisatawan')
  return wis ? 'Wisatawan' : 'Anggota'
}

function profilKeUser(profil: ProfilSaya): AuthUser {
  return {
    id: profil.id,
    name: profil.nama,
    email: profil.email,
    avatar: AVATAR_DEFAULT,
    role: labelPeran(profil),
    profil,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const applyProfil = useCallback((profil: ProfilSaya | null) => {
    setUser(profil ? profilKeUser(profil) : null)
  }, [])

  useEffect(() => {
    bootstrapSesi()
      .then(applyProfil)
      .finally(() => setIsLoading(false))
  }, [applyProfil])

  const masuk = useCallback(async (payload: MasukPayload) => {
    await apiMasuk(payload)
    const profil = await bootstrapSesi()
    if (!profil) throw new Error('Gagal memuat profil setelah masuk')
    applyProfil(profil)
  }, [applyProfil])

  const daftar = useCallback(async (payload: DaftarPayload) => {
    const res = await apiDaftar(payload)
    return res.pesan
  }, [])

  const logout = useCallback(async () => {
    await apiKeluar()
    applyProfil(null)
  }, [applyProfil])

  const refreshProfil = useCallback(async () => {
    const profil = await bootstrapSesi()
    applyProfil(profil)
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

export { pesanGalat }
