"""Jejak Lestari — neraca regeneratif (KPI setara GMV).

Anti-greenwashing: skor_ekologi hanya dari monitoring TERVERIFIKASI. Klaim dampak
stempel divalidasi silang ke indikator terverifikasi; klaim tanpa dukungan → 0 skor.
Bobot tiga pilar = konfigurasi (input Pokdarwis), bukan hardcode.
Periode terkunci → periode_final.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List
from uuid import UUID

from . import errors as E
from .enums import StatusMonitoring
from .model import NeracaRegeneratif
from .util import Jam, uuid7


@dataclass
class BobotNeraca:
    # placeholder — WAJIB disepakati FGD Pokdarwis sebelum go-live
    ekologi: float = 0.4
    sosial: float = 0.3
    ekonomi: float = 0.3
    target_indikator: int = 3      # jml indikator ekologi target
    target_penyedia_lokal: int = 5
    target_gmv: float = 10_000_000.0


class LayananNeraca:
    def __init__(self, repo_neraca, repo_monitoring, repo_indikator, repo_transaksi,
                 repo_stempel, jam: Jam, bobot: BobotNeraca | None = None):
        self.neraca = repo_neraca
        self.monitoring = repo_monitoring
        self.indikator = repo_indikator
        self.transaksi = repo_transaksi
        self.stempel = repo_stempel
        self.jam = jam
        self.bobot = bobot or BobotNeraca()

    async def _existing(self, desa_id: UUID, periode: str):
        rows = await self.neraca.daftar(desa_id, lambda n: n.periode == periode)
        return rows[0] if rows else None

    async def hitung(self, desa_id: UUID, periode: str) -> NeracaRegeneratif:
        ada = await self._existing(desa_id, periode)
        if ada and ada.terkunci:
            raise E.periode_final(f"neraca {periode} terkunci")

        b = self.bobot

        # --- Ekologi: HANYA monitoring terverifikasi (anti-greenwashing) ---
        mons = await self.monitoring.daftar(
            desa_id,
            lambda m: m.status == StatusMonitoring.terverifikasi
            and m.waktu_ukur.strftime("%Y-%m") == periode)
        indikator_terverifikasi = set()
        for m in mons:
            indi = await self.indikator.ambil(desa_id, m.indikator_id)
            if indi:
                indikator_terverifikasi.add(indi.kode)
        skor_ekologi = min(1.0, len(indikator_terverifikasi) / b.target_indikator)

        # Validasi silang klaim stempel → hanya yang didukung monitoring dihitung
        stempels = await self.stempel.daftar(
            desa_id, lambda s: s.status == StatusMonitoring.terverifikasi)
        klaim_diklaim = 0
        klaim_tervalidasi = 0
        for s in stempels:
            for _, n in (s.dampak or {}).items():
                klaim_diklaim += n
                if s.indikator_kode in indikator_terverifikasi:
                    klaim_tervalidasi += n
        # catatan: klaim tak menaikkan skor_ekologi bila indikatornya tak terverifikasi

        # --- Sosial: sebaran ke penyedia lokal ---
        trx = await self.transaksi.daftar(desa_id, lambda t: t.tanggal.strftime("%Y-%m") == periode)
        penyedia_lokal = {t.penyedia_id for t in trx if t.lokal}
        skor_sosial = min(1.0, len(penyedia_lokal) / b.target_penyedia_lokal)

        # --- Ekonomi: GMV periode ---
        gmv = sum(t.bruto for t in trx)
        skor_ekonomi = min(1.0, gmv / b.target_gmv) if b.target_gmv else 0.0

        skor_total = (b.ekologi * skor_ekologi + b.sosial * skor_sosial
                      + b.ekonomi * skor_ekonomi)

        komponen = {
            "indikator_terverifikasi": sorted(indikator_terverifikasi),
            "klaim_dampak_diklaim": klaim_diklaim,
            "klaim_dampak_tervalidasi": klaim_tervalidasi,
            "penyedia_lokal": len(penyedia_lokal),
            "gmv": gmv,
            "bobot": {"ekologi": b.ekologi, "sosial": b.sosial, "ekonomi": b.ekonomi},
        }

        if ada:
            ada.skor_ekologi = skor_ekologi
            ada.skor_sosial = skor_sosial
            ada.skor_ekonomi = skor_ekonomi
            ada.skor_total = skor_total
            ada.komponen = komponen
            ada.dibuat_pada = self.jam.now()
            return await self.neraca.simpan(ada)

        n = NeracaRegeneratif(
            id=uuid7(), desa_id=desa_id, periode=periode, skor_ekologi=skor_ekologi,
            skor_sosial=skor_sosial, skor_ekonomi=skor_ekonomi, skor_total=skor_total,
            komponen=komponen, dibuat_pada=self.jam.now())
        return await self.neraca.simpan(n)

    async def kunci(self, desa_id: UUID, periode: str) -> NeracaRegeneratif:
        n = await self._existing(desa_id, periode)
        if n is None:
            raise E.tidak_ditemukan()
        n.terkunci = True
        return await self.neraca.simpan(n)
