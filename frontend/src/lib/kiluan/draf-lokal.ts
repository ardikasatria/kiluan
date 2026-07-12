const VERSI = 1 as const
const AWALAN = 'sigerciv:draft:'

export interface EntriDrafLokal<T> {
  data: T
  diperbaruiPada: number
  versi: typeof VERSI
}

export function kunciDrafLokal(tipe: string, desaSlug: string, id: string): string {
  return `${AWALAN}${tipe}:${desaSlug}:${id}`
}

export function bacaDrafLokal<T>(kunci: string): EntriDrafLokal<T> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(kunci)
    if (!raw) return null
    const parsed = JSON.parse(raw) as EntriDrafLokal<T>
    if (!parsed || parsed.versi !== VERSI || !parsed.data) return null
    return parsed
  } catch {
    return null
  }
}

export function simpanDrafLokal<T>(kunci: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const entri: EntriDrafLokal<T> = { data, diperbaruiPada: Date.now(), versi: VERSI }
    localStorage.setItem(kunci, JSON.stringify(entri))
  } catch {
    /* kuota penuh — abaikan */
  }
}

export function hapusDrafLokal(kunci: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(kunci)
  } catch {
    /* abaikan */
  }
}
