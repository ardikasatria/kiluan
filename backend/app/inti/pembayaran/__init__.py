"""Adapter pembayaran ber-gate — manual-first (PkM), stub gateway."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class InstruksiManual:
    url: str
    catatan: str


class PenyediaBayar(Protocol):
    async def instruksi_manual(self, kode_pesanan: str) -> InstruksiManual: ...


class PembayaranManual:
    """QRIS statis + catatan kode pesanan (tahap 1 PkM)."""

    async def instruksi_manual(self, kode_pesanan: str) -> InstruksiManual:
        return InstruksiManual(
            url="https://kiluan.sainsdataciv.com/static/qris-pokdarwis.png",
            catatan=f"Sertakan kode {kode_pesanan} pada berita transfer.",
        )


def penyedia_bayar(gateway: str) -> PenyediaBayar:
    if gateway in ("manual", "xendit", "midtrans"):
        return PembayaranManual()
    return PembayaranManual()


# Stub signature gateway (ADR gateway terpisah — Tahun 4–5)
SIGNATURE_GATEWAY: dict[str, str] = {
    "xendit": "sig-xnd",
    "midtrans": "sig-mid",
    "manual": "sig-man",
}


def verifikasi_signature_webhook(gateway: str, signature: str | None) -> bool:
    expected = SIGNATURE_GATEWAY.get(gateway)
    return expected is not None and signature == expected
