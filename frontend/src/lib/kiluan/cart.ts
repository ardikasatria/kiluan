/** Keranjang transient per-desa (localStorage, bukan tabel server). */
export interface ItemKeranjang {
  item_tipe: 'produk_jasa' | 'paket_wisata'
  item_id: string
  nama: string
  harga: number
  jumlah: number
  slot_jadwal_id?: string
  tanggal_slot?: string
  metadata?: Record<string, unknown>
}

const kunci = (desa: string) => `kiluan-cart:${desa}`

export function bacaKeranjang(desa: string): ItemKeranjang[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(kunci(desa))
    return raw ? (JSON.parse(raw) as ItemKeranjang[]) : []
  } catch {
    return []
  }
}

export function simpanKeranjang(desa: string, item: ItemKeranjang[]) {
  localStorage.setItem(kunci(desa), JSON.stringify(item))
  window.dispatchEvent(new CustomEvent('kiluan-cart', { detail: { desa } }))
}

export function tambahKeKeranjang(desa: string, item: ItemKeranjang) {
  const ada = bacaKeranjang(desa)
  const idx = ada.findIndex(
    (x) => x.item_id === item.item_id && x.slot_jadwal_id === item.slot_jadwal_id,
  )
  if (idx >= 0) {
    ada[idx].jumlah += item.jumlah
  } else {
    ada.push(item)
  }
  simpanKeranjang(desa, ada)
}

export function hapusDariKeranjang(desa: string, item_id: string, slot_jadwal_id?: string) {
  simpanKeranjang(
    desa,
    bacaKeranjang(desa).filter(
      (x) => !(x.item_id === item_id && x.slot_jadwal_id === slot_jadwal_id),
    ),
  )
}

export function kosongkanKeranjang(desa: string) {
  localStorage.removeItem(kunci(desa))
  window.dispatchEvent(new CustomEvent('kiluan-cart', { detail: { desa } }))
}

export function subtotalKeranjang(item: ItemKeranjang[]) {
  return item.reduce((s, it) => s + it.harga * it.jumlah, 0)
}

/** UUID untuk Idempotency-Key — disimpan sampai checkout sukses. */
export function kunciIdempotensi(aksi: string): string {
  const k = `kiluan-idem:${aksi}`
  let v = sessionStorage.getItem(k)
  if (!v) {
    v = crypto.randomUUID()
    sessionStorage.setItem(k, v)
  }
  return v
}

export function hapusKunciIdempotensi(aksi: string) {
  sessionStorage.removeItem(`kiluan-idem:${aksi}`)
}
