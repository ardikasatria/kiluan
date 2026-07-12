import { apiFetch } from './client'
import type {
  BookingDto,
  CheckoutPayload,
  PembayaranDto,
  PesananItemDto,
  PesananRingkas,
  SlotJadwal,
} from './types'

function hdrIdem(key: string): HeadersInit {
  return { 'Idempotency-Key': key }
}

export async function getSlot(
  desaSlug: string,
  opts: {
    subjek_tipe: string
    subjek_id: string
    dari?: string
    sampai?: string
    kelola?: boolean
  },
): Promise<{ item: SlotJadwal[] }> {
  const q = new URLSearchParams({
    subjek_tipe: opts.subjek_tipe,
    subjek_id: opts.subjek_id,
  })
  if (opts.dari) q.set('dari', opts.dari)
  if (opts.sampai) q.set('sampai', opts.sampai)
  if (opts.kelola) q.set('kelola', 'true')
  return apiFetch(`/api/v1/desa/${desaSlug}/slot?${q}`, { auth: opts.kelola ?? false })
}

export async function buatSlot(
  desaSlug: string,
  body: {
    subjek_tipe: string
    subjek_id: string
    tanggal: string
    kuota: number
    waktu_mulai?: string
    harga_override?: number
  },
): Promise<SlotJadwal> {
  return apiFetch(`/api/v1/desa/${desaSlug}/slot`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function buatSlotBatch(
  desaSlug: string,
  body: {
    subjek_tipe: string
    subjek_id: string
    dari: string
    sampai: string
    kuota: number
    waktu_mulai?: string
    harga_override?: number
  },
): Promise<{ item: SlotJadwal[] }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/slot/batch`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function ubahSlot(
  desaSlug: string,
  slotId: string,
  body: { kuota?: number; harga_override?: number | null; status?: string },
): Promise<SlotJadwal> {
  return apiFetch(`/api/v1/desa/${desaSlug}/slot/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function hapusSlot(desaSlug: string, slotId: string): Promise<void> {
  await apiFetch(`/api/v1/desa/${desaSlug}/slot/${slotId}`, { method: 'DELETE' })
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

export async function daftarPesananKelola(
  desaSlug: string,
  opts?: { status?: string; penyedia_tipe?: string; penyedia_id?: string },
): Promise<{ item: PesananRingkas[] }> {
  const q = new URLSearchParams({ kelola: 'true' })
  if (opts?.status) q.set('status', opts.status)
  if (opts?.penyedia_tipe) q.set('penyedia_tipe', opts.penyedia_tipe)
  if (opts?.penyedia_id) q.set('penyedia_id', opts.penyedia_id)
  return apiFetch(`/api/v1/desa/${desaSlug}/pesanan?${q}`)
}

export async function ubahFulfillment(
  desaSlug: string,
  pesananId: string,
  itemId: string,
  status_fulfillment: string,
): Promise<{ item: PesananItemDto }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/pesanan/${pesananId}/item/${itemId}/fulfillment`, {
    method: 'PATCH',
    body: JSON.stringify({ status_fulfillment }),
  })
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

export async function daftarBooking(
  desaSlug: string,
  opts?: { tanggal?: string; status?: string },
): Promise<{ item: BookingDto[] }> {
  const q = new URLSearchParams()
  if (opts?.tanggal) q.set('tanggal', opts.tanggal)
  if (opts?.status) q.set('status', opts.status)
  const qs = q.toString()
  return apiFetch(`/api/v1/desa/${desaSlug}/booking${qs ? `?${qs}` : ''}`)
}

export async function checkinBooking(
  desaSlug: string,
  bookingIdOrKode: string,
): Promise<BookingDto> {
  return apiFetch(`/api/v1/desa/${desaSlug}/booking/${encodeURIComponent(bookingIdOrKode)}/checkin`, {
    method: 'POST',
  })
}

export async function selesaiBooking(
  desaSlug: string,
  bookingId: string,
  idempotencyKey: string,
): Promise<{ pesanan: PesananRingkas }> {
  return apiFetch(`/api/v1/desa/${desaSlug}/booking/${bookingId}/selesai`, {
    method: 'POST',
    headers: hdrIdem(idempotencyKey),
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
