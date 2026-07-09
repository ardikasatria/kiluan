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

// --- F1: Lencana Warga ---

export interface BadgeItem {
  id: number
  kode: string
  nama: string
  deskripsi?: string | null
  ikon?: string | null
  tingkat: number
  syarat: Record<string, unknown>
}

export interface BadgeMilik extends BadgeItem {
  diperoleh_pada?: string | null
}

export interface TransaksiPoinItem {
  kode_aksi: string
  poin: number
  referensi_tipe?: string | null
  referensi_id?: string | null
  dibuat_pada?: string | null
}

export interface PoinSayaResponse {
  saldo: number
  riwayat: TransaksiPoinItem[]
  meta: MetaPaginasi
}

export interface AturanPoinItem {
  kode_aksi: string
  poin: number
  deskripsi?: string | null
  aktif: boolean
}

export interface LeaderboardPengguna {
  id: string
  nama: string
  avatar?: string | null
}

export interface LeaderboardEntry {
  peringkat: number
  pengguna: LeaderboardPengguna
  poin: number
  badge_teratas?: { kode: string; nama: string; ikon?: string | null } | null
}

export interface BidangUsaha {
  id: number
  kode: string
  nama: string
  ikon?: string | null
}

// --- F1: Pasar Desa ---

export interface UmkmRingkas {
  id: string
  nama: string
  bidang: { id: number; kode: string; nama: string; ikon?: string | null }
  status_verifikasi: string
  lokasi?: Lokasi | null
  sertifikasi?: { tingkat: string } | null
  jarak_m?: number
}

export interface UmkmDetail extends UmkmRingkas {
  deskripsi?: string | null
  telepon?: string | null
  whatsapp?: string | null
  alamat?: string | null
  produk_ringkas?: { id: string; nama: string; harga: number }[]
  dibuat_pada?: string | null
}

export interface ProdukJasaItem {
  id: string
  umkm: { id: string; nama: string }
  nama: string
  jenis: 'produk' | 'jasa'
  deskripsi?: string | null
  harga: number
  satuan_harga: string
  stok?: number | null
  status: string
  media?: unknown[]
}

export interface PaketItemRow {
  id: string
  hari: number
  urutan: number
  judul?: string | null
  deskripsi?: string | null
  destinasi?: { id: string; nama?: string } | null
  layanan?: { id: string; nama?: string } | null
  produk_jasa?: { id: string; nama?: string } | null
  durasi_menit: number
}

export interface PaketRingkas {
  id: string
  slug: string
  nama: string
  agen: { id: string; nama: string }
  durasi_jam: number
  harga: number
  satuan_harga: string
  kuota_default: number
  status: string
  media_utama?: unknown | null
}

export interface PaketDetail extends PaketRingkas {
  deskripsi?: string | null
  item: PaketItemRow[]
}

export interface KurasiLogItem {
  id: string
  entitas_tipe: string
  entitas_id: string
  dari_status: string
  ke_status: string
  keputusan: string
  catatan?: string | null
  dibuat_pada?: string | null
}

// --- F1: Dapur Konten ---

export type TipeKontribusi = 'foto' | 'tips' | 'koreksi_data' | 'spot_baru' | 'ulasan'
export type TargetKontribusi = 'destinasi' | 'layanan' | 'umkm' | 'paket_wisata' | 'desa'
export type StatusKontribusi = 'menunggu' | 'disetujui' | 'ditolak' | 'revisi'

export interface KontribusiItem {
  id: string
  tipe: TipeKontribusi
  target_tipe: TargetKontribusi
  target_id?: string | null
  muatan: Record<string, unknown>
  media_id?: string | null
  status: StatusKontribusi
  penyumbang_id: string
  dibuat_pada?: string | null
  diperbarui_pada?: string | null
}

export interface KontribusiTarget {
  target_tipe: TargetKontribusi
  target_id?: string
  label?: string
}

// --- F1: Naik Kelas Lestari ---

export type SubjekPengajuan = 'umkm' | 'agen' | 'pokdarwis'
export type StatusPengajuanKartu = 'menunggu' | 'tervalidasi' | 'ditolak' | 'revisi'
export type TingkatSertifikasi = 'tunas' | 'bahari' | 'lumba_lumba'

export interface KartuAksiItem {
  id: number
  kode: string
  nama: string
  deskripsi?: string
  kenapa_penting?: string
  bukti_dibutuhkan: Record<string, boolean>
  bobot: number
}

export interface PengajuanKartuItem {
  id: string
  subjek_tipe: SubjekPengajuan
  subjek_id: string
  kartu: { id: number; nama: string }
  bukti: Record<string, unknown>
  status: StatusPengajuanKartu
  validator?: { id: string; nama: string } | null
  catatan?: string | null
  dibuat_pada?: string | null
  divalidasi_pada?: string | null
}

export interface SertifikasiItem {
  subjek_tipe?: string
  subjek_id?: string
  tingkat: TingkatSertifikasi | null
  skor: number
  diperbarui_pada?: string | null
}

// --- F2 Dermaga ---

export interface SlotJadwal {
  id: string
  subjek_tipe: string
  subjek_id: string
  tanggal: string
  waktu_mulai?: string | null
  kuota: number
  sisa: number
  harga_override?: number | null
  status: string
}

export interface PesananItemDto {
  id: string
  item_tipe: string
  item_id: string
  nama_snapshot: string
  harga_snapshot: number
  jumlah: number
  subtotal: number
  status_fulfillment: string
  metadata?: Record<string, unknown>
  booking?: { id: string; kode_checkin: string; status: string } | null
}

export interface PesananRingkas {
  id: string
  kode_pesanan: string
  status: string
  subtotal: number
  diskon: number
  ongkir: number
  total: number
  kedaluwarsa_pada?: string | null
  dibuat_pada: string
  metode_ambil?: string
  kontak?: Record<string, unknown>
  item?: PesananItemDto[]
}

export interface PembayaranDto {
  id: string
  metode: string
  penyedia_gateway: string
  jumlah: number
  status: string
  redirect_url?: string | null
  bukti_media_id?: string | null
  kedaluwarsa_pada?: string | null
  dibayar_pada?: string | null
  instruksi_qris_statis?: { url: string; catatan: string }
}

export interface TransaksiDto {
  id: string
  pesanan_id: string
  penyedia: { tipe: string; id: string }
  jenis: string
  bruto: number
  fee_platform: number
  porsi_reinvestasi: number
  neto_penyedia: number
  status: string
  payout_id?: string | null
  dibuat_pada: string
}

export interface RekeningDto {
  id: string
  penyedia: { tipe: string; id: string }
  jenis: string
  bank_kode?: string | null
  nomor_mask: string
  nama_pemilik: string
  terverifikasi: boolean
  utama: boolean
}

export interface PayoutDto {
  id: string
  penyedia: { tipe: string; id: string }
  jumlah: number
  metode: string
  status: string
  rekening?: { jenis: string; nomor_mask: string } | null
  dibuat_pada: string
  diproses_pada?: string | null
}

export interface RefundDto {
  id: string
  pesanan_id: string
  alasan: string
  jumlah: number
  status: string
  dibuat_pada: string
  selesai_pada?: string | null
}

export interface HadiahDto {
  id: string
  kode: string
  nama: string
  deskripsi?: string | null
  jenis: string
  biaya_poin: number
  stok: number | null
  syarat: Record<string, unknown>
  aktif: boolean
}

export interface KuponRingkas {
  id: string
  kode: string
  sumber: string
  tipe_diskon: string
  nilai: number
  min_belanja?: number | null
  batas_pakai: number
  terpakai: number
  status: string
  penyedia_terbatas?: string[] | null
  pemilik_id?: string | null
}

export interface PenukaranDto {
  id: string
  hadiah_id: string
  poin_dipakai: number
  kupon_id?: string | null
  status: string
  dibuat_pada: string
}

export interface CheckoutPayload {
  kontak: { nama: string; telepon?: string; email?: string }
  metode_ambil: 'ambil_ditempat' | 'kirim'
  alamat_kirim?: Record<string, unknown> | null
  kupon_id?: string | null
  kupon_kode?: string | null
  ongkir?: number
  item: Array<{
    item_tipe: string
    item_id: string
    jumlah: number
    slot_jadwal_id?: string
    metadata?: Record<string, unknown>
  }>
}

export interface MisiRingkas {
  id: string
  kode: string
  judul: string
  jenis: 'belajar' | 'aksi'
  kategori: string
  poin: number
  aktif: boolean
  stasiun?: { id: string; nama: string } | null
}

export interface MisiDetail extends MisiRingkas {
  deskripsi?: string | null
  micro_lesson?: Record<string, unknown> | null
  syarat_verifikasi: Record<string, unknown>
  dampak_template: Record<string, unknown>
}

export interface StasiunLestariDto {
  id: string
  nama: string
  tipe: string
  radius_m: number
  aktif: boolean
  lokasi?: Lokasi | null
  qr_token?: string
}

export interface StempelDto {
  id: string
  misi_id: string
  status: 'menunggu_verifikasi' | 'terverifikasi' | 'ditolak'
  dampak: Record<string, number>
  dibuat_pada: string
  misi?: { id: string; judul: string }
  stasiun?: { id: string; nama: string } | null
  booking_id?: string | null
  media_id?: string | null
}

export interface PasporDto {
  id: string
  ringkasan_dampak: Record<string, number>
  total_stempel: number
  diperbarui_pada: string
  stempel: StempelDto[]
}

export interface VerifikasiDto {
  id: string
  entitas_tipe: string
  entitas_id: string
  metode: string
  hasil: 'menunggu' | 'valid' | 'invalid'
  verifikator_id?: string | null
  dibuat_pada: string
  diputuskan_pada?: string | null
}

export interface MisiSelesaiPayload {
  booking_id?: string
  bukti?: {
    qr_token?: string
    lokasi?: Lokasi
    foto_media_id?: string
  }
  dampak?: Record<string, number>
}

export interface ItineraryItem {
  slot_id: string
  tanggal: string
  harga: number
  subjek_tipe: string
  subjek_id: string
  nama?: string | null
}

export interface PemanduItineraryRes {
  sesi_id: string
  itinerary: ItineraryItem[]
  perkiraan_biaya: number
  model_dipakai: string
  mesin_konfig: string
  label: string
}

export interface PemanduEstimasiRes {
  sesi_id: string
  total: number
  model_dipakai: string
  mesin_konfig: string
}

export interface PemanduChatRes {
  sesi_id: string
  jawaban: string
  sumber: Array<{ tipe: string; id: string; nama: string; cuplikan?: string }>
  model_dipakai: string
  mesin_konfig: string
  label: string
}

export interface SesiPemanduDto {
  id: string
  tipe: string
  masukan: Record<string, unknown>
  keluaran: Record<string, unknown> | null
  model_dipakai: string
  dibuat_pada: string
  percakapan?: Array<{
    id: string
    peran: string
    isi: string
    sumber?: unknown
    dibuat_pada: string
  }>
}
