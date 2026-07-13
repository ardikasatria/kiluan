import { cariDestinasiKelola } from '@/lib/api/destinasi'
import { getLayananDesa } from '@/lib/api/layanan'
import { getAntreanKurasi, getKontribusiSaya } from '@/lib/api/kontribusi'
import { getDaftarPaket, getProdukKelola, getUmkmKelola } from '@/lib/api/pasar'
import type { PeranKode } from './peran'

async function statsPengelolaDesa(desaSlug: string) {
  const [destinasi, layanan, kurasi] = await Promise.all([
    cariDestinasiKelola(desaSlug),
    getLayananDesa(desaSlug),
    getAntreanKurasi(desaSlug, { status: 'menunggu' }),
  ])
  const publik = destinasi.item.filter((d) => d.status === 'publikasi').length
  const draft = destinasi.item.filter((d) => d.status === 'draft').length
  return {
    publik,
    draft,
    layanan: layanan.length,
    kontrib: kurasi.item.length,
    spot: publik + draft,
    anggota: '—',
    verif: 0,
    dana: '—',
  }
}

export async function ambilStatsDasbor(
  desaSlug: string,
  peran: PeranKode,
): Promise<Record<string, string | number>> {
  switch (peran) {
    case 'kontributor': {
      const [pengelola, kontrib] = await Promise.all([
        statsPengelolaDesa(desaSlug),
        getKontribusiSaya(desaSlug),
      ])
      const diterima = kontrib.item.filter((k) => k.status === 'disetujui').length
      return {
        ...pengelola,
        total: kontrib.item.length,
        diterima,
        poin: 0,
        peringkat: '—',
      }
    }
    case 'perangkat_desa':
      return statsPengelolaDesa(desaSlug)
    case 'umkm': {
      const [umkm, produk] = await Promise.all([
        getUmkmKelola(desaSlug),
        getProdukKelola(desaSlug),
      ])
      const aktif = produk.item.filter((p) => p.status === 'publikasi').length
      const tingkat = umkm.item[0]?.sertifikasi?.tingkat ?? '—'
      return {
        produk: aktif,
        pesanan: 0,
        rating: '—',
        tingkat: tingkat === 'tunas' ? 'Tunas' : tingkat === 'bahari' ? 'Bahari' : tingkat === 'lumba_lumba' ? 'Lumba-Lumba' : '—',
      }
    }
    case 'agen': {
      const paket = await getDaftarPaket(desaSlug)
      const publik = paket.item.filter((p) => p.status === 'publikasi').length
      const review = paket.item.filter((p) => p.status === 'review').length
      return { paket: publik, draft: review, kuota: '—', pendapatan: '—' }
    }
    case 'wisatawan': {
      const kontrib = await getKontribusiSaya(desaSlug)
      const diterima = kontrib.item.filter((k) => k.status === 'disetujui').length
      return {
        total: kontrib.item.length,
        diterima,
        kontrib: kontrib.item.length,
        misi: '—',
        stempel: 0,
        poin: 0,
        peringkat: '—',
      }
    }
    case 'organisasi':
      return { program: 0, indikator: '—', sponsor: '—', laporan: 0 }
    case 'admin':
      return { desa: '—', pengguna: '—', moderasi: 0, kesehatan: 'OK' }
    default:
      return {}
  }
}
