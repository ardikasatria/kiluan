"""Jembatan F2 ↔ backend (Konteks, amplop galat, UUID)."""
from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from app.domain.errors import (
    BuktiKurang,
    DiLuarGeofence,
    IdempotencyKeyWajib,
    KebijakanRefund,
    KesalahanDomain,
    KesalahanValidasi,
    Konflik,
    KuponTidakBerlaku,
    SaldoPoinKurang,
    SlotPenuh,
    StokHabis,
    TidakBerwenang,
    TidakDitemukan,
    TidakTerautentikasi,
    TransisiIlegalF2,
    WebhookSignatureInvalid,
)
from app.domain.konteks import Konteks
from app.domain.enums import KodePeran

from . import errors as f2_errors
from .enums import ADMIN, AGEN, POKDARWIS, PERANGKAT, UMKM, WISATAWAN
from .models import Aktor

if TYPE_CHECKING:
    from app.repo.memori import Penyimpanan

_MAP = {
    "idempotency_key_wajib": IdempotencyKeyWajib,
    "transisi_ilegal": TransisiIlegalF2,
    "slot_penuh": SlotPenuh,
    "stok_habis": StokHabis,
    "saldo_poin_kurang": SaldoPoinKurang,
    "kupon_tidak_berlaku": KuponTidakBerlaku,
    "di_luar_geofence": DiLuarGeofence,
    "bukti_kurang": BuktiKurang,
    "webhook_signature_invalid": WebhookSignatureInvalid,
    "kebijakan_refund": KebijakanRefund,
    "tidak_terautentikasi": TidakTerautentikasi,
    "tidak_berwenang": TidakBerwenang,
    "tidak_ditemukan": TidakDitemukan,
    "konflik": Konflik,
    "validasi_gagal": KesalahanValidasi,
}


def angkat_f2(exc: f2_errors.GalatDomain) -> KesalahanDomain:
    cls = _MAP.get(exc.kode, KesalahanDomain)
    if cls is KesalahanDomain and exc.kode != "galat_server":
        err = KesalahanValidasi(exc.pesan, exc.rincian) if exc.http == 422 else KesalahanDomain(exc.pesan, exc.rincian)
        err.kode = exc.kode
        err.http = exc.http
        return err
    return cls(exc.pesan, exc.rincian)


_PERAN = {
    KodePeran.wisatawan: WISATAWAN,
    KodePeran.umkm: UMKM,
    KodePeran.agen: AGEN,
    KodePeran.pokdarwis: POKDARWIS,
    KodePeran.perangkat_desa: PERANGKAT,
    KodePeran.admin: ADMIN,
}


def aktor_dari_konteks(konteks: Konteks, desa_id: UUID) -> Aktor:
    peran = frozenset(_PERAN[p] for p in konteks.peran_di(desa_id) if p in _PERAN)
    return Aktor(str(konteks.pengguna_id) if konteks.pengguna_id else "", peran)


def _uid(v) -> str:
    return str(v)


async def sinkron_katalog_f1(store: "Penyimpanan", basis, desa_id: UUID) -> None:
    """Salin produk & paket F1 ke repo F2 in-memory (untuk checkout API)."""
    did = _uid(desa_id)
    for p in await store.produk_jasa.daftar(desa_id):
        from .models import ProdukJasa

        await basis.produk.simpan(
            ProdukJasa(
                id=_uid(p.id),
                desa_id=did,
                umkm_id=_uid(p.umkm_id),
                nama=p.nama,
                harga=Decimal(str(p.harga)),
                stok=p.stok,
            )
        )
    for pk in await store.paket_wisata.daftar(desa_id):
        from .clock import id_baru
        from .models import PaketWisata

        agen_id = _uid(pk.agen_id) if pk.agen_id else id_baru()
        await basis.paket.simpan(
            PaketWisata(
                id=_uid(pk.id),
                desa_id=did,
                agen_id=agen_id,
                nama=pk.nama,
                harga=Decimal(str(pk.harga)),
            )
        )
