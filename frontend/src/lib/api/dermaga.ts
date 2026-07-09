import { apiFetch } from './client'
import type {
  CheckoutPayload,
  PembayaranDto,
  PesananRingkas,
  SlotJadwal,
} from './types'

function hdrIdem(key: string): HeadersInit {
  return { 'Idempotency-Key': key }
}

export async function getSlot(
  desaSlug: string,
  opts: { subjek_tipe: string; subjek_id: string; dari?: string; sampai?: string },
): Promise<{ item: SlotJadwal[] }> {
  const q = new URLSearchParams({
    subjek_tipe: opts.subjek_tipe,
    subjek_id: opts.subjek_id,
  })
  if (opts.dari) q.set('dari', opts.dari)
  if (opts.sampai) q.set('sampai', opts.sampai)
  return apiFetch(`/api/v1/desa/${desaSlug}/slot?${q}`, { auth: false })
}

export async function checkout(
  desaSlug: string,
  body: CheckoutPayload,
  idempotencyKey: string,
): Promise<{ pesanan: PesananRingkas; pembayaran: { instruksi: string } }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/checkout`, {
    method: 'POST',
    headers: hdrIdem(idempotencyKey),
    body: JSON.stringify(body),
  })
}

export async function getPesanan(desaSlug: string, id: string): Promise<PesananRingkas> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pesanan/${id}`)
}

export async function daftarPesananSaya(desaSlug: string): Promise<{ item: PesananRingkas[] }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pesanan?milik=saya`)
}

export async function buatPembayaran(
  desaSlug: string,
  pesananId: string,
  metode: string,
  idempotencyKey: string,
): Promise<{ pembayaran: PembayaranDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pesanan/${pesananId}/pembayaran`, {
    method: 'POST',
    headers: hdrIdem(idempotencyKey),
    body: JSON.stringify({ metode }),
  })
}

export async function unggahBuktiPembayaran(
  desaSlug: string,
  pembayaranId: string,
  bukti_media_id: string,
): Promise<{ pembayaran: PembayaranDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pembayaran/${pembayaranId}/bukti`, {
    method: 'POST',
    body: JSON.stringify({ bukti_media_id }),
  })
}

export async function cekKupon(
  desaSlug: string,
  kode: string,
  total: number,
  penyedia?: string,
): Promise<{ berlaku: boolean; diskon: number; kupon_id?: string; kode?: string }> {
  const q = new URLSearchParams({ total: String(total) })
  if (penyedia) q.set('penyedia', penyedia)
  return apiFetch(`/api/v1/desa/${desaSlug}/kupon/${encodeURIComponent(kode)}/cek?${q}`)
}

export async function checkinBooking(
  desaSlug: string,
  bookingId: string,
): Promise<{ id: string; kode_checkin: string; status: string }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/booking/${bookingId}/checkin`, {
    method: 'POST',
  })
}

export async function daftarPembayaranAntrean(
  desaSlug: string,
  status = 'menunggu',
): Promise<{ item: PembayaranDto[] }> {
  const q = new URLSearchParams({ status })
  return apiFetch(`/api/v1/desa/${desaSlug}/pembayaran?${q}`)
}

export async function konfirmasiManual(
  desaSlug: string,
  pembayaranId: string,
  idempotencyKey: string,
): Promise<{ pembayaran: PembayaranDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pembayaran/${pembayaranId}/konfirmasi-manual`, {
    method: 'POST',
    headers: hdrIdem(idempotencyKey),
  })
}
