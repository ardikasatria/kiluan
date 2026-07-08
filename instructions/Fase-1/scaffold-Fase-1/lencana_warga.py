"""Lencana Warga (KONTRAK §5): poin ledger idempoten, badge otomatis, leaderboard."""
from __future__ import annotations

from datetime import timedelta
from uuid import UUID

from ..ids import sekarang
from ..models import BadgePengguna, TransaksiPoin
from ..repositori import RepoMemori, keyset


class BadgeService:
    def __init__(self, repo_badge: RepoMemori, repo_badge_pengguna: RepoMemori,
                 poin_service: "PoinService"):
        self.badge = repo_badge
        self.badge_pengguna = repo_badge_pengguna
        self.poin = poin_service

    async def _sudah_punya(self, pengguna_id: UUID, badge_id: int) -> bool:
        milik = await self.badge_pengguna.cari(pengguna_id=pengguna_id, badge_id=badge_id)
        return bool(milik)

    async def _terpenuhi(self, desa_id: UUID, pengguna_id: UUID, syarat: dict) -> bool:
        if "poin_min" in syarat:
            saldo = await self.poin.saldo(desa_id, pengguna_id)
            return saldo >= syarat["poin_min"]
        if "aksi" in syarat and "jumlah" in syarat:
            jml = await self.poin.hitung_aksi(desa_id, pengguna_id, syarat["aksi"])
            return jml >= syarat["jumlah"]
        return False

    async def evaluasi(self, desa_id: UUID, pengguna_id: UUID) -> list[int]:
        """Evaluasi semua badge global+lokal; award yang terpenuhi & belum dimiliki."""
        baru: list[int] = []
        for b in await self.badge.semua():
            if not b.aktif:
                continue
            if b.desa_id not in (None, desa_id):
                continue
            if await self._sudah_punya(pengguna_id, b.id):
                continue
            if await self._terpenuhi(desa_id, pengguna_id, b.syarat):
                await self.badge_pengguna.simpan(BadgePengguna(pengguna_id=pengguna_id, badge_id=b.id))
                baru.append(b.id)
        return baru

    async def milik(self, pengguna_id: UUID) -> list[BadgePengguna]:
        return await self.badge_pengguna.cari(pengguna_id=pengguna_id)


class PoinService:
    def __init__(self, repo_transaksi: RepoMemori, repo_aturan: RepoMemori):
        self.transaksi = repo_transaksi
        self.aturan = repo_aturan
        self.badge_service: BadgeService | None = None  # di-wire belakangan

    async def _aturan(self, desa_id: UUID, kode_aksi: str):
        # lokal menang atas global
        lokal = await self.aturan.cari(kode_aksi=kode_aksi, desa_id=desa_id, aktif=True)
        if lokal:
            return lokal[0]
        glob = await self.aturan.cari(kode_aksi=kode_aksi, desa_id=None, aktif=True)
        return glob[0] if glob else None

    async def _sudah_award(self, pengguna_id, kode_aksi, referensi_tipe, referensi_id) -> bool:
        cocok = await self.transaksi.cari(
            pengguna_id=pengguna_id, kode_aksi=kode_aksi,
            referensi_tipe=referensi_tipe, referensi_id=referensi_id,
        )
        return bool(cocok)

    async def award(self, desa_id: UUID, pengguna_id: UUID, kode_aksi: str,
                    referensi_tipe: str | None = None, referensi_id: UUID | None = None) -> bool:
        """Idempoten via UNIQUE(pengguna, kode_aksi, referensi_tipe, referensi_id) (ERD §3.9)."""
        aturan = await self._aturan(desa_id, kode_aksi)
        if aturan is None:
            return False
        if await self._sudah_award(pengguna_id, kode_aksi, referensi_tipe, referensi_id):
            return False  # double-award dicegah
        await self.transaksi.simpan(TransaksiPoin(
            desa_id=desa_id, pengguna_id=pengguna_id, aturan_id=aturan.id,
            kode_aksi=kode_aksi, poin=aturan.poin,
            referensi_tipe=referensi_tipe, referensi_id=referensi_id,
        ))
        if self.badge_service is not None:
            await self.badge_service.evaluasi(desa_id, pengguna_id)
        return True

    async def _transaksi_desa(self, desa_id: UUID, pengguna_id: UUID | None = None):
        rows = await self.transaksi.cari(desa_id=desa_id)
        if pengguna_id is not None:
            rows = [r for r in rows if r.pengguna_id == pengguna_id]
        return rows

    async def saldo(self, desa_id: UUID, pengguna_id: UUID) -> int:
        return sum(r.poin for r in await self._transaksi_desa(desa_id, pengguna_id))

    async def hitung_aksi(self, desa_id: UUID, pengguna_id: UUID, kode_aksi: str) -> int:
        return sum(1 for r in await self._transaksi_desa(desa_id, pengguna_id)
                   if r.kode_aksi == kode_aksi)

    async def riwayat(self, desa_id: UUID, pengguna_id: UUID, kursor=None, batas=20):
        rows = await self._transaksi_desa(desa_id, pengguna_id)
        return keyset(rows, kursor, batas)

    async def leaderboard(self, desa_id: UUID, periode: str = "all", batas: int = 20) -> list[dict]:
        rows = await self._transaksi_desa(desa_id)
        if periode != "all":
            hari = {"7h": 7, "30h": 30}.get(periode)
            if hari:
                batas_wkt = sekarang() - timedelta(days=hari)
                rows = [r for r in rows if r.dibuat_pada >= batas_wkt]
        skor: dict[UUID, int] = {}
        for r in rows:
            skor[r.pengguna_id] = skor.get(r.pengguna_id, 0) + r.poin
        papan = sorted(skor.items(), key=lambda kv: kv[1], reverse=True)
        return [
            {"peringkat": i + 1, "pengguna_id": pid, "poin": p}
            for i, (pid, p) in enumerate(papan[:batas])
        ]
