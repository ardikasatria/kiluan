"""Amplop error kontrak API F1 (mewarisi F0 §1)."""
from __future__ import annotations


class KesalahanDomain(Exception):
    kode = "galat_server"
    http = 500

    def __init__(self, pesan: str, rincian: list | None = None):
        super().__init__(pesan)
        self.pesan = pesan
        self.rincian = rincian or []

    def amplop(self) -> dict:
        return {"galat": {"kode": self.kode, "pesan": self.pesan, "rincian": self.rincian}}


class ValidasiGagal(KesalahanDomain):
    kode = "validasi_gagal"
    http = 422


class TransisiIlegal(ValidasiGagal):
    pass


class TidakBerwenang(KesalahanDomain):
    kode = "tidak_berwenang"
    http = 403


class TidakDitemukan(KesalahanDomain):
    kode = "tidak_ditemukan"
    http = 404


class Konflik(KesalahanDomain):
    kode = "konflik"
    http = 409
