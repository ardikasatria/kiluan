import { cariDestinasiKelola } from '@/lib/api/destinasi'
import { daftarPesananKelola } from '@/lib/api/dermaga'
import { getLayananDesa } from '@/lib/api/layanan'
import { daftarKeanggotaan } from '@/lib/api/keanggotaan'
import { getAntreanKurasi, getKontribusiSaya } from '@/lib/api/kontribusi'
import { getDaftarPaket, getProdukKelola, getUmkmKelola } from '@/lib/api/pasar'
import { statsDasborOrganisasi } from '@/lib/kiluan/organisasi-stats'
import type { PeranKode } from './peran'

const STATUS_PESANAN_AKTIF = new Set(['dibayar', 'diproses'])

async function statsPesananPenyedia(desaSlug: string) {
  try {
    const res = await daftarPesananKelola(desaSlug)
    return {
      pesanan: res.item.filter((p) => STATUS_PESANAN_AKTIF.has(p.status)).length,
      pesananTotal: res.item.length,
    }
  } catch {
    return { pesanan: 0, pesananTotal: 0 }
  }
}

async function statsPengelolaDesa(desaSlug: string) {
  const [destinasi, layanan, kurasi, keanggotaan] = await Promise.all([
    cariDestinasiKelola(desaSlug),
    getLayananDesa(desaSlug),
    getAntreanKurasi(desaSlug, { status: 'menunggu' }),
    daftarKeanggotaan(desaSlug, { status: 'menunggu' }),
  ])
  const publik = destinasi.item.filter((d) => d.status === 'publikasi').length
  const draft = destinasi.item.filter((d) => d.status === 'draft').length
  return {
    publik,
    draft,
    layanan: layanan.length,
    kontrib: kurasi.item.length,
    spot: publik + draft,
    anggota: keanggotaan.item.length,
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
      const [umkm, produk, pesanan] = await Promise.all([
        getUmkmKelola(desaSlug),
        getProdukKelola(desaSlug),
        statsPesananPenyedia(desaSlug),
      ])
      const aktif = produk.item.filter((p) => p.status === 'publikasi').length
      const tingkat = umkm.item[0]?.sertifikasi?.tingkat ?? '—'
      return {
        produk: aktif,
        pesanan: pesanan.pesanan,
        pendapatan: '—',
        tingkat: tingkat === 'tunas' ? 'Tunas' : tingkat === 'bahari' ? 'Bahari' : tingkat === 'lumba_lumba' ? 'Lumba-Lumba' : '—',
      }
    }
    case 'agen': {
      const [paket, pesanan] = await Promise.all([
        getDaftarPaket(desaSlug),
        statsPesananPenyedia(desaSlug),
      ])
      const publik = paket.item.filter((p) => p.status === 'publikasi').length
      const review = paket.item.filter((p) => p.status === 'review').length
      return { paket: publik, draft: review, pesanan: pesanan.pesanan, pendapatan: '—' }
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
      return statsDasborOrganisasi(desaSlug)
    case 'admin':
      return { desa: '—', pengguna: '—', moderasi: 0, kesehatan: 'OK' }
    default:
      return {}
  }
}
