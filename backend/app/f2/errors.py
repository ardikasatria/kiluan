"""Amplop galat konsisten (F0 §1) + kode internal F2 (§1)."""
from __future__ import annotations


class GalatDomain(Exception):
    def __init__(self, kode: str, pesan: str, http: int = 422, rincian=None) -> None:
        super().__init__(pesan)
        self.kode = kode
        self.pesan = pesan
        self.http = http
        self.rincian = rincian or []

    def amplop(self) -> dict:
        return {"galat": {"kode": self.kode, "pesan": self.pesan, "rincian": self.rincian}}


# --- konstruktor ringkas ---
def validasi_gagal(pesan="Validasi gagal.", kode="validasi_gagal", rincian=None):
    return GalatDomain(kode, pesan, 422, rincian)

def tidak_terautentikasi(pesan="Tidak terautentikasi."):
    return GalatDomain("tidak_terautentikasi", pesan, 401)

def tidak_berwenang(pesan="Peran/scope kurang."):
    return GalatDomain("tidak_berwenang", pesan, 403)

def tidak_ditemukan(pesan="Tidak ditemukan."):
    # Lintas-tenant juga memakai ini (F0): jangan bocorkan eksistensi.
    return GalatDomain("tidak_ditemukan", pesan, 404)

def konflik(pesan="Konflik.", kode="konflik"):
    return GalatDomain(kode, pesan, 409)

def idempotency_wajib():
    return GalatDomain("idempotency_key_wajib", "Header Idempotency-Key wajib.", 422)

def transisi_ilegal(pesan="Transisi status tak sah."):
    return GalatDomain("transisi_ilegal", pesan, 422)

def slot_penuh():
    return GalatDomain("slot_penuh", "Kuota slot habis.", 409)

def stok_habis():
    return GalatDomain("stok_habis", "Stok tak cukup.", 409)

def saldo_poin_kurang():
    return GalatDomain("saldo_poin_kurang", "Saldo poin kurang.", 422)

def kupon_tidak_berlaku(pesan="Kupon tidak berlaku."):
    return GalatDomain("kupon_tidak_berlaku", pesan, 422)

def di_luar_geofence():
    return GalatDomain("di_luar_geofence", "Lokasi di luar geofence.", 422)

def bukti_kurang():
    return GalatDomain("bukti_kurang", "Bukti verifikasi tak memenuhi syarat.", 422)

def webhook_signature_invalid():
    return GalatDomain("webhook_signature_invalid", "Signature webhook invalid.", 401)

def kebijakan_refund():
    return GalatDomain("kebijakan_refund", "Refund melanggar kebijakan escrow.", 422)
