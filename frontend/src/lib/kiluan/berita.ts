import type { KategoriBerita } from '@/lib/api/types'

export const KODE_KATEGORI_BERITA: KategoriBerita[] = [
  'pengumuman',
  'cerita',
  'konservasi',
  'acara',
  'panduan',
  'lainnya',
]

export const KATEGORI_BERITA: { kode: KategoriBerita; label: string }[] = [
  { kode: 'pengumuman', label: 'Pengumuman' },
  { kode: 'cerita', label: 'Cerita' },
  { kode: 'konservasi', label: 'Konservasi' },
  { kode: 'acara', label: 'Acara' },
  { kode: 'panduan', label: 'Panduan' },
  { kode: 'lainnya', label: 'Lainnya' },
]

export function labelKategoriBerita(kode: KategoriBerita, t?: (key: string) => string): string {
  if (t) return t(`kategori.${kode}`)
  return KATEGORI_BERITA.find((k) => k.kode === kode)?.label ?? kode
}

/** Render markdown sederhana ke HTML (heading, bold, link, list, blockquote). */
export function renderMarkdownSederhana(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  let html = escape(md)

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 underline dark:text-primary-400">$1</a>')
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
  html = html.replace(/\n\n/g, '</p><p>')
  html = `<p>${html}</p>`
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/<p>(<h[123]>)/g, '$1')
  html = html.replace(/(<\/h[123]>)<\/p>/g, '$1')
  html = html.replace(/<p>(<ul>)/g, '$1')
  html = html.replace(/(<\/ul>)<\/p>/g, '$1')
  html = html.replace(/<p>(<blockquote>)/g, '$1')
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1')

  return html
}
