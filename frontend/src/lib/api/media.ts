import { pastikanTokenAkses } from './auth'
import { apiFetch } from './client'
import type {
  KonfirmasiMediaPayload,
  LampiranPayload,
  MediaItem,
  PresignResponse,
} from './types'

function namaBerkasAman(nama: string): string {
  const dasar = nama.split(/[/\\]/).pop()?.trim() || 'upload'
  const aman = dasar.replace(/[^\w.\-()+]/g, '_').slice(0, 120)
  return aman || 'upload'
}

/** URL foto sampul (utama) dari daftar media entitas. */
export function urlSampulDariMedia(media: MediaItem[]): string | null {
  if (!media.length) return null
  const urut = [...media]
    .filter((m) => m.url)
    .sort((a, b) => {
      if (a.utama && !b.utama) return -1
      if (!a.utama && b.utama) return 1
      return (a.urutan ?? 0) - (b.urutan ?? 0)
    })
  return urut[0]?.url ?? null
}

export async function presignMedia(
  desaSlug: string,
  file: Pick<File, 'name' | 'type' | 'size'>,
): Promise<PresignResponse> {
  await pastikanTokenAkses()
  return apiFetch(`/api/v1/desa/${desaSlug}/media/presign`, {
    method: 'POST',
    body: JSON.stringify({
      nama_berkas: namaBerkasAman(file.name),
      mime: file.type || 'application/octet-stream',
      ukuran: file.size,
    }),
  })
}

export async function konfirmasiMedia(desaSlug: string, payload: KonfirmasiMediaPayload): Promise<MediaItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/media/konfirmasi`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getMediaDetail(desaSlug: string, mediaId: string): Promise<MediaItem> {
  return apiFetch(`/api/v1/desa/${desaSlug}/media/${mediaId}`)
}

/** PUT biner langsung ke MinIO (presigned) — dengan progress 0–100. */
export function unggahKeMinio(
  urlUnggah: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', urlUnggah)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Unggah gagal (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Jaringan gagal saat unggah ke MinIO'))
    xhr.send(file)
  })
}

export async function tempelLampiran(desaSlug: string, payload: LampiranPayload) {
  return apiFetch(`/api/v1/desa/${desaSlug}/lampiran`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function ubahLampiran(
  desaSlug: string,
  lampiranId: string,
  ubah: { urutan?: number; utama?: boolean },
) {
  return apiFetch(`/api/v1/desa/${desaSlug}/lampiran/${lampiranId}`, {
    method: 'PATCH',
    body: JSON.stringify(ubah),
  })
}

export async function hapusLampiran(desaSlug: string, lampiranId: string) {
  return apiFetch(`/api/v1/desa/${desaSlug}/lampiran/${lampiranId}`, {
    method: 'DELETE',
  })
}

export interface UnggahOpsi {
  desaSlug: string
  file: File
  entitasTipe: LampiranPayload['entitas_tipe']
  entitasId: string
  alt?: string
  utama?: boolean
  urutan?: number
  onProgress?: (pct: number) => void
}

/** Alur lengkap: presign → PUT MinIO → konfirmasi → tempel lampiran. */
export async function unggahDanTempel(opsi: UnggahOpsi): Promise<MediaItem> {
  const pr = await presignMedia(opsi.desaSlug, opsi.file)
  await unggahKeMinio(pr.url_unggah, opsi.file, opsi.onProgress)

  let lebar: number | undefined
  let tinggi: number | undefined
  if (opsi.file.type.startsWith('image/')) {
    const dim = await bacaDimensiGambar(opsi.file)
    lebar = dim.lebar
    tinggi = dim.tinggi
  }

  const media = await konfirmasiMedia(opsi.desaSlug, {
    media_id: pr.media_id,
    tipe: opsi.file.type.startsWith('video/') ? 'video' : 'foto',
    lebar,
    tinggi,
    alt: opsi.alt ?? opsi.file.name.replace(/\.[^.]+$/, ''),
  })

  const lam = (await tempelLampiran(opsi.desaSlug, {
    media_id: pr.media_id,
    entitas_tipe: opsi.entitasTipe,
    entitas_id: opsi.entitasId,
    urutan: opsi.urutan ?? 0,
    utama: opsi.utama ?? false,
  })) as { id: string }

  return {
    ...media,
    lampiran_id: lam.id,
    utama: opsi.utama ?? false,
    urutan: opsi.urutan ?? 0,
  }
}

function bacaDimensiGambar(file: File): Promise<{ lebar: number; tinggi: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ lebar: img.naturalWidth, tinggi: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Gagal membaca dimensi gambar'))
    }
    img.src = url
  })
}
