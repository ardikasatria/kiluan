import { apiFetch } from './client'
import type { PayoutDto, RefundDto, RekeningDto, TransaksiDto } from './types'

function hdrIdem(key: string): HeadersInit {
  return { 'Idempotency-Key': key }
}

export async function getTransaksi(
  desaSlug: string,
  opts?: { penyedia_tipe?: string; penyedia_id?: string; status?: string },
): Promise<{ item: TransaksiDto[] }> {
  const q = new URLSearchParams()
  if (opts?.penyedia_tipe) q.set('penyedia_tipe', opts.penyedia_tipe)
  if (opts?.penyedia_id) q.set('penyedia_id', opts.penyedia_id)
  if (opts?.status) q.set('status', opts.status)
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/transaksi${qs ? `?${qs}` : ''}`)
}

export async function getRekening(
  desaSlug: string,
  opts?: { penyedia_tipe?: string; penyedia_id?: string },
): Promise<{ item: RekeningDto[] }> {
  const q = new URLSearchParams()
  if (opts?.penyedia_tipe) q.set('penyedia_tipe', opts.penyedia_tipe)
  if (opts?.penyedia_id) q.set('penyedia_id', opts.penyedia_id)
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/rekening${qs ? `?${qs}` : ''}`)
}

export async function buatRekening(
  desaSlug: string,
  body: {
    penyedia_tipe: string
    penyedia_id: string
    jenis: string
    nomor: string
    nama_pemilik: string
    bank_kode?: string
  },
): Promise<{ rekening: RekeningDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/rekening`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function verifikasiRekening(
  desaSlug: string,
  rekeningId: string,
  terverifikasi = true,
): Promise<{ rekening: RekeningDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/rekening/${rekeningId}/verifikasi`, {
    method: 'PATCH',
    body: JSON.stringify({ terverifikasi }),
  })
}

export async function getPayout(
  desaSlug: string,
  opts?: { penyedia_id?: string; status?: string },
): Promise<{ item: PayoutDto[] }> {
  const q = new URLSearchParams()
  if (opts?.penyedia_id) q.set('penyedia_id', opts.penyedia_id)
  if (opts?.status) q.set('status', opts.status)
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/payout${qs ? `?${qs}` : ''}`)
}

export async function buatPayout(
  desaSlug: string,
  body: { penyedia_tipe: string; penyedia_id: string; rekening_id: string; metode?: string },
  idempotencyKey: string,
): Promise<{ payout: PayoutDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/payout`, {
    method: 'POST',
    headers: hdrIdem(idempotencyKey),
    body: JSON.stringify(body),
  })
}

export async function transisiPayout(
  desaSlug: string,
  payoutId: string,
  aksi: 'tandai_berhasil' | 'tandai_gagal',
): Promise<{ payout: PayoutDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/payout/${payoutId}/transisi`, {
    method: 'POST',
    body: JSON.stringify({ aksi }),
  })
}

export async function ajukanRefund(
  desaSlug: string,
  body: { pesanan_id: string; alasan: string; jumlah?: number },
  idempotencyKey: string,
): Promise<{ refund: RefundDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/refund`, {
    method: 'POST',
    headers: hdrIdem(idempotencyKey),
    body: JSON.stringify(body),
  })
}

export async function getRefund(
  desaSlug: string,
  opts?: { status?: string; milik?: 'saya' },
): Promise<{ item: RefundDto[] }> {
  const q = new URLSearchParams()
  if (opts?.status) q.set('status', opts.status)
  if (opts?.milik) q.set('milik', opts.milik)
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/refund${qs ? `?${qs}` : ''}`)
}

export async function transisiRefund(
  desaSlug: string,
  refundId: string,
  aksi: 'setuju' | 'tolak' | 'proses' | 'selesai',
): Promise<{ refund: RefundDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/refund/${refundId}/transisi`, {
    method: 'POST',
    body: JSON.stringify({ aksi }),
  })
}

export async function getPengaturanDesa(
  desaSlug: string,
): Promise<{ persen_reinvestasi: number; persen_fee_platform: number }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pengaturan`, { auth: false })
}
