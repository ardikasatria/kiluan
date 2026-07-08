export interface Lokasi {
  lat: number
  lng: number
}

export interface MetaPaginasi {
  kursor_berikutnya: string | null
  ada_lagi: boolean
  batas: number
}

export interface DiscoveryParams {
  q?: string
  desa?: string
  kategori?: number
  tag?: string
  dekat?: string
  radius_m?: number
  batas?: number
  kursor?: string
}

export interface ProfilDesa {
  slug: string
  nama: string
  deskripsi?: string | null
  lokasi?: Lokasi | null
  provinsi?: string | null
  kabupaten?: string | null
  kecamatan?: string | null
  pekon?: string | null
  logo?: string | null
  warna_primer?: string | null
}

export interface Kategori {
  id: number
  kode: string
  nama: string
}

export interface Tag {
  id: number
  kode: string
  nama: string
}

export interface DesaRingkas {
  slug: string
  nama: string
  deskripsi?: string | null
  lokasi?: Lokasi | null
  jarak_m?: number | null
}

export interface DestinasiRingkas {
  id: string
  slug: string
  nama: string
  kategori_id: number
  lokasi: Lokasi | null
  status: string
  alamat?: string | null
  desa_slug?: string | null
  jarak_m?: number | null
}

export interface MediaItem {
  id: string
  lampiran_id?: string | null
  url?: string | null
  tipe?: string | null
  mime?: string | null
  ukuran?: number | null
  lebar?: number | null
  tinggi?: number | null
  alt?: string | null
  utama?: boolean
  urutan?: number
  dibuat_pada?: string | null
}

export interface PresignResponse {
  media_id: string
  objek_minio: string
  url_unggah: string
  kedaluwarsa_dalam: number
}

export interface KonfirmasiMediaPayload {
  media_id: string
  tipe: 'foto' | 'video'
  lebar?: number
  tinggi?: number
  alt?: string
}

export interface LampiranPayload {
  media_id: string
  entitas_tipe: 'destinasi' | 'layanan' | 'desa' | 'pengguna'
  entitas_id: string
  urutan?: number
  utama?: boolean
}

export interface LayananItem {
  id: string
  nama: string
  jenis: string
  deskripsi?: string | null
  harga: number
  satuan_harga: string
  destinasi_id?: string | null
  penyedia?: { id: string; nama: string } | null
  ketersediaan?: Record<string, unknown> | null
  status: string
}

export interface KalenderItem {
  id: string
  judul: string
  tipe: string
  destinasi_id?: string | null
  waktu_mulai?: string | null
  waktu_selesai?: string | null
  pengulangan?: Record<string, unknown> | null
  berlaku_mulai?: string | null
  berlaku_sampai?: string | null
  status: string
}

export interface DestinasiLengkap extends DestinasiRingkas {
  deskripsi?: string | null
  area?: unknown
  jam_operasional?: Record<string, string> | null
  tag: Tag[]
  media: MediaItem[]
  layanan: LayananItem[]
  kalender: KalenderItem[]
  kategori?: Kategori | null
  dibuat_pada?: string | null
  diperbarui_pada?: string | null
}

export interface CuacaResponse {
  darat: {
    status: string
    prakiraan?: unknown
    diperbarui?: string
  }
  maritim: {
    status: string
    perairan?: Record<string, unknown> | null
    kode?: string
    diperbarui?: string
  } | null
  sumber: string
  diperbarui: string | null
}

export interface DestinasiBuatPayload {
  nama: string
  slug: string
  kategori_id: number
  lokasi: Lokasi
  deskripsi?: string
  alamat?: string
  jam_operasional?: Record<string, string>
  status?: 'draft' | 'publikasi' | 'arsip'
}
