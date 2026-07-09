/** URL atau path relatif yang bisa dipakai `<Image />`; UUID media_id diabaikan. */
export function adalahUrlAvatar(src?: string | null): src is string {
  if (!src) return false
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')
}

const PALET = [
  '#5C6BC0',
  '#7E57C2',
  '#AB47BC',
  '#EC407A',
  '#EF5350',
  '#FF7043',
  '#FFA726',
  '#FFCA28',
  '#9CCC65',
  '#66BB6A',
  '#26A69A',
  '#26C6DA',
  '#29B6F6',
  '#42A5F5',
  '#5C6BC0',
  '#8D6E63',
  '#78909C',
  '#7CB342',
  '#00897B',
  '#1E88E5',
] as const

/** Ambil 1–2 huruf inisial dari nama (kata pertama + kata terakhir). */
export function inisialDariNama(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean)
  if (kata.length === 0) return '?'
  if (kata.length === 1) {
    const w = kata[0]
    return w.length >= 2 ? w.slice(0, 2).toUpperCase() : w[0].toUpperCase()
  }
  return (kata[0][0] + kata[kata.length - 1][0]).toUpperCase()
}

/** Warna latar konsisten per nama (seperti palet kontak WhatsApp). */
export function warnaAvatarDariNama(nama: string): string {
  const teks = nama.trim().toLowerCase() || '?'
  let hash = 0
  for (let i = 0; i < teks.length; i++) {
    hash = teks.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALET[Math.abs(hash) % PALET.length]
}
