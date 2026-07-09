"""Kesalahan domain. Tiap kelas memetakan ke amplop error kontrak API (§1).

Layer API (FastAPI) menerjemahkan `kode`/`http` ini menjadi respons JSON:
    {"galat": {"kode": ..., "pesan": ..., "rincian": [...]}}
"""
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


class KesalahanValidasi(KesalahanDomain):
    kode = "validasi_gagal"
    http = 422


class TransisiIlegal(KesalahanValidasi):
    pass


class TidakTerautentikasi(KesalahanDomain):
    kode = "tidak_terautentikasi"
    http = 401


class TidakBerwenang(KesalahanDomain):
    kode = "tidak_berwenang"
    http = 403


class TidakDitemukan(KesalahanDomain):
    kode = "tidak_ditemukan"
    http = 404


class Konflik(KesalahanDomain):
    kode = "konflik"
    http = 409


class TerlaluBanyakPermintaan(KesalahanDomain):
    kode = "terlalu_banyak_permintaan"
    http = 429
