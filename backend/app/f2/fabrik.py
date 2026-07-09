"""Factory: rakit Basis + semua layanan, dan helper seed skenario Teluk Kiluan."""
from __future__ import annotations

from decimal import Decimal

from .clock import Jam, id_baru
from .enums import ADMIN, AGEN, POKDARWIS, UMKM, WISATAWAN
from .layanan_dermaga import DermagaService
from .layanan_pemandu import PemanduService
from .layanan_penjelajah import PenjelajahService
from .layanan_poin import PoinService
from .models import (
    Aktor, KatalogHadiah, Kupon, Misi, PaketWisata, PengaturanDesa, ProdukJasa,
    RekeningPenyedia, SlotJadwal, StasiunLestari, TransaksiPoin,
)
from .layanan_uang import UangService
from .repos import Basis


class App:
    def __init__(self) -> None:
        self.jam = Jam()
        self.b = Basis()
        self.dermaga = DermagaService(self.b, self.jam)
        self.uang = UangService(self.b, self.jam)
        self.poin = PoinService(self.b, self.jam)
        self.penjelajah = PenjelajahService(self.b, self.jam)
        self.pemandu = PemanduService(self.b, self.jam)


def aktor(pengguna_id, *peran):
    return Aktor(pengguna_id, frozenset(peran))


async def seed(app: App, desa_id="desa-kiluan", **kw):
    """Seed satu desa: pengaturan, UMKM+produk, agen+paket+slot, wisatawan."""
    b = app.b
    await b.pengaturan.simpan(
        PengaturanDesa(
            desa_id,
            persen_reinvestasi=Decimal(str(kw.get("reinvestasi", "0.10"))),
            persen_fee_platform=Decimal(str(kw.get("fee", "0.02"))),
            batas_hold_menit=kw.get("hold", 30),
            gateway=kw.get("gateway", "manual"),
        )
    )
    umkm_id = "umkm-bahari"
    produk = ProdukJasa(id_baru(), desa_id, umkm_id, "Keripik Pisang", Decimal("25000"), stok=100)
    await b.produk.simpan(produk)

    agen_id = "agen-lumba"
    paket = PaketWisata(id_baru(), desa_id, agen_id, "Trip Lumba-Lumba", Decimal("300000"))
    await b.paket.simpan(paket)
    slot = SlotJadwal(
        id_baru(), desa_id, "paket_wisata", paket.id, "2026-07-12",
        kuota=kw.get("kuota", 2), harga_override=Decimal("300000"),
    )
    await b.slot.simpan(slot)

    rek = RekeningPenyedia(
        id_baru(), desa_id, "pengguna", agen_id, "bank", "1234567890", "Agen Lumba",
        bank_kode="014", terverifikasi=True,
    )
    await b.rekening.simpan(rek)

    return {
        "desa_id": desa_id, "produk": produk, "paket": paket, "slot": slot, "rek": rek,
        "umkm_id": umkm_id, "agen_id": agen_id,
        "wisatawan": aktor("w-1", WISATAWAN),
        "bendahara": aktor("b-1", POKDARWIS),
        "admin": aktor("a-1", ADMIN),
    }


async def beri_poin(app: App, desa_id, pengguna_id, poin):
    await app.b.transaksi_poin.simpan(
        TransaksiPoin(id_baru(), desa_id, pengguna_id, "seed", poin, "seed", id_baru())
    )
