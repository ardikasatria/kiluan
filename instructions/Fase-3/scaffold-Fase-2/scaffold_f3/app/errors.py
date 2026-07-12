"""Amplop galat domain — kode internal + status HTTP (mengikuti F0).

Kode F3 baru + kode warisan F1/F2 yang dipakai ulang.
"""
from __future__ import annotations


class GalatDomain(Exception):
    def __init__(self, kode: str, http: int, pesan: str = ""):
        self.kode = kode
        self.http = http
        self.pesan = pesan or kode
        super().__init__(f"{http} {kode}: {self.pesan}")


# --- pabrik kode (biar dipakai konsisten & bisa di-assert di test) ---
def bukti_media_wajib(pesan=""):
    return GalatDomain("bukti_media_wajib", 422, pesan)

def indikator_tidak_aktif(pesan=""):
    return GalatDomain("indikator_tidak_aktif", 422, pesan)

def metrik_tidak_dikenal(pesan=""):
    return GalatDomain("metrik_tidak_dikenal", 422, pesan)

def periode_final(pesan=""):
    return GalatDomain("periode_final", 409, pesan)

def job_sedang_berjalan(pesan=""):
    return GalatDomain("job_sedang_berjalan", 409, pesan)

def daya_dukung_terlampaui(pesan=""):
    return GalatDomain("daya_dukung_terlampaui", 409, pesan)

def di_luar_geofence(pesan=""):
    return GalatDomain("di_luar_geofence", 422, pesan)

def bukti_kurang(pesan=""):
    return GalatDomain("bukti_kurang", 422, pesan)

def transisi_ilegal(pesan=""):
    return GalatDomain("transisi_ilegal", 422, pesan)

def idempotency_key_wajib(pesan=""):
    return GalatDomain("idempotency_key_wajib", 422, pesan)

def validasi_gagal(pesan=""):
    return GalatDomain("validasi_gagal", 422, pesan)

def tidak_ditemukan(pesan=""):
    # isolasi tenant / entitas lintas-desa selalu 404 (F0)
    return GalatDomain("tidak_ditemukan", 404, pesan)
