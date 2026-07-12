import type { Locale } from '@/i18n/routing'

/**
 * Map stable reference codes from API to localized display labels.
 * Populated per-namespace during page-by-page i18n migration (Fase 1+).
 */
const LABEL_KATEGORI: Record<Locale, Record<string, string>> = {
  id: {
    pantai: 'Pantai',
    snorkeling: 'Snorkeling',
    'lumba-lumba': 'Lumba-lumba',
    mangrove: 'Mangrove',
    budaya: 'Budaya',
    kuliner: 'Kuliner',
  },
  en: {
    pantai: 'Beach',
    snorkeling: 'Snorkeling',
    'lumba-lumba': 'Dolphins',
    mangrove: 'Mangrove',
    budaya: 'Culture',
    kuliner: 'Culinary',
  },
}

const LABEL_STATUS: Record<Locale, Record<string, string>> = {
  id: {
    draft: 'Draft',
    publikasi: 'Publikasi',
    arsip: 'Arsip',
    review: 'Menunggu kurasi',
    menunggu: 'Menunggu',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak',
    revisi: 'Perlu revisi',
    tervalidasi: 'Tervalidasi',
    aktif: 'Aktif',
    nonaktif: 'Nonaktif',
    menunggu_pembayaran: 'Menunggu pembayaran',
    dibayar: 'Dibayar',
    diproses: 'Diproses',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
    kedaluwarsa: 'Kedaluwarsa',
    refund_diajukan: 'Refund diajukan',
    diajukan: 'Diajukan',
    belum_dibaca: 'Belum dibaca',
    dibaca: 'Dibaca',
  },
  en: {
    draft: 'Draft',
    publikasi: 'Published',
    arsip: 'Archived',
    review: 'Awaiting curation',
    menunggu: 'Pending',
    disetujui: 'Approved',
    ditolak: 'Rejected',
    revisi: 'Needs revision',
    tervalidasi: 'Validated',
    aktif: 'Active',
    nonaktif: 'Inactive',
    menunggu_pembayaran: 'Awaiting payment',
    dibayar: 'Paid',
    diproses: 'Processing',
    selesai: 'Completed',
    dibatalkan: 'Cancelled',
    kedaluwarsa: 'Expired',
    refund_diajukan: 'Refund requested',
    diajukan: 'Submitted',
    belum_dibaca: 'Unread',
    dibaca: 'Read',
  },
}

const LABEL_TINGKAT: Record<Locale, Record<string, string>> = {
  id: {
    tunas: 'Tunas',
    bahari: 'Bahari',
    lumba_lumba: 'Lumba-lumba',
  },
  en: {
    tunas: 'Tunas',
    bahari: 'Bahari',
    lumba_lumba: 'Dolphin',
  },
}

export function labelKategori(kode: string, locale: Locale, fallback?: string): string {
  return LABEL_KATEGORI[locale][kode] ?? fallback ?? kode
}

export function labelStatus(kode: string, locale: Locale, fallback?: string): string {
  return LABEL_STATUS[locale][kode] ?? fallback ?? kode
}

export function labelTingkat(kode: string, locale: Locale, fallback?: string): string {
  return LABEL_TINGKAT[locale][kode] ?? fallback ?? kode
}
