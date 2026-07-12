"""Lencana Warga (KONTRAK §5): poin ledger idempoten, badge otomatis, leaderboard."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.domain.paginasi import keyset


def _now() -> datetime:
    return datetime.now(timezone.utc)


class LencanaLayanan:
    def __init__(self, store):
        self.store = store

    async def _terpenuhi(self, desa_id: UUID, pengguna_id: UUID, syarat: dict) -> bool:
        if "poin_min" in syarat:
            return await self.saldo(desa_id, pengguna_id) >= syarat["poin_min"]
        if "aksi" in syarat and "jumlah" in syarat:
            return await self._hitung_aksi(desa_id, pengguna_id, syarat["aksi"]) >= syarat["jumlah"]
        return False

    async def _evaluasi_badge(self, desa_id: UUID, pengguna_id: UUID) -> list[int]:
        baru: list[int] = []
        for b in await self.store.badge.daftar_aktif(desa_id):
            if await self.store.badge_pengguna.cari(pengguna_id=pengguna_id, badge_id=b.id):
                continue
            syarat = b.syarat if isinstance(b.syarat, dict) else {}
            if not await self._terpenuhi(desa_id, pengguna_id, syarat):
                continue
            if await self.store.badge_pengguna.tambah_idempoten(pengguna_id, b.id):
                baru.append(b.id)
        return baru

    async def award(
        self,
        desa_id: UUID,
        pengguna_id: UUID,
        kode_aksi: str,
        referensi_tipe: str | None = None,
        referensi_id: UUID | None = None,
    ) -> bool:
        aturan = await self.store.aturan_poin.ambil_aturan(desa_id, kode_aksi)
        if aturan is None:
            return False
        ok = await self.store.transaksi_poin.award(
            desa_id=desa_id,
            pengguna_id=pengguna_id,
            aturan_id=aturan.id,
            kode_aksi=kode_aksi,
            poin=aturan.poin,
            referensi_tipe=referensi_tipe,
            referensi_id=referensi_id,
        )
        if ok:
            await self._evaluasi_badge(desa_id, pengguna_id)
        return ok

    async def saldo(self, desa_id: UUID, pengguna_id: UUID) -> int:
        rows = await self.store.transaksi_poin.daftar_desa(desa_id, pengguna_id)
        return sum(r.poin for r in rows)

    async def _hitung_aksi(self, desa_id: UUID, pengguna_id: UUID, kode_aksi: str) -> int:
        rows = await self.store.transaksi_poin.daftar_desa(desa_id, pengguna_id)
        return sum(1 for r in rows if r.kode_aksi == kode_aksi)

    async def poin_saya(
        self, desa_id: UUID, pengguna_id: UUID, kursor: str | None = None, batas: int = 20,
    ) -> dict:
        rows = await self.store.transaksi_poin.daftar_desa(desa_id, pengguna_id)
        hal = keyset(rows, batas=batas, kursor=kursor)
        urutan_tingkat = {"tunas": 1, "bahari": 2, "lumba_lumba": 3}
        tingkat: str | None = None
        skor_tingkat = 0
        for umkm in await self.store.umkm.cari(desa_id=desa_id, pengguna_id=pengguna_id):
            for sertifikasi in await self.store.sertifikasi_owner.cari(
                desa_id=desa_id, subjek_tipe="umkm", subjek_id=umkm.id,
            ):
                skor = urutan_tingkat.get(sertifikasi.tingkat, 0)
                if skor > skor_tingkat:
                    tingkat = sertifikasi.tingkat
                    skor_tingkat = skor
        return {
            "saldo": await self.saldo(desa_id, pengguna_id),
            "tingkat": tingkat,
            "riwayat": [
                {
                    "kode_aksi": t.kode_aksi,
                    "poin": t.poin,
                    "referensi_tipe": t.referensi_tipe,
                    "referensi_id": str(t.referensi_id) if t.referensi_id else None,
                    "dibuat_pada": t.dibuat_pada.isoformat() if t.dibuat_pada else None,
                }
                for t in hal.item
            ],
            "meta": hal.meta(),
        }

    async def leaderboard(
        self, desa_id: UUID, periode: str = "all", batas: int = 20,
    ) -> list[dict]:
        rows = await self.store.transaksi_poin.daftar_desa(desa_id)
        if periode != "all":
            hari = {"7h": 7, "30h": 30}.get(periode)
            if hari:
                batas_wkt = _now() - timedelta(days=hari)
                rows = [r for r in rows if r.dibuat_pada and r.dibuat_pada >= batas_wkt]
        skor: dict[UUID, int] = {}
        for r in rows:
            skor[r.pengguna_id] = skor.get(r.pengguna_id, 0) + r.poin
        papan = sorted(skor.items(), key=lambda kv: kv[1], reverse=True)[:batas]
        badges_aktif = await self.store.badge.daftar_aktif(desa_id)
        peta_badge = {b.id: b for b in badges_aktif}
        hasil = []
        for i, (pid, poin) in enumerate(papan):
            p = await self.store.pengguna.ambil(pid)
            badge_teratas = None
            milik = await self.store.badge_pengguna.daftar_milik(pid)
            tertinggi = None
            for m in milik:
                b = peta_badge.get(m.badge_id)
                if b and (tertinggi is None or b.tingkat > tertinggi.tingkat):
                    tertinggi = b
            if tertinggi:
                badge_teratas = {"kode": tertinggi.kode, "nama": tertinggi.nama, "ikon": tertinggi.ikon}
            hasil.append({
                "peringkat": i + 1,
                "pengguna": {
                    "id": str(pid),
                    "nama": p.nama if p else "Warga",
                    "avatar": str(p.avatar_media_id) if p and getattr(p, "avatar_media_id", None) else None,
                },
                "poin": poin,
                "badge_teratas": badge_teratas,
            })
        return hasil

    async def katalog_badge(self, desa_id: UUID) -> list[dict]:
        return [
            {
                "id": b.id,
                "kode": b.kode,
                "nama": b.nama,
                "deskripsi": b.deskripsi,
                "ikon": b.ikon,
                "tingkat": b.tingkat,
                "syarat": b.syarat if isinstance(b.syarat, dict) else {},
            }
            for b in await self.store.badge.daftar_aktif(desa_id)
        ]

    async def badge_saya(self, desa_id: UUID, pengguna_id: UUID) -> list[dict]:
        milik = await self.store.badge_pengguna.daftar_milik(pengguna_id)
        badges = {b.id: b for b in await self.store.badge.daftar_aktif(desa_id)}
        return [
            {
                "id": bp.badge_id,
                "kode": badges[bp.badge_id].kode,
                "nama": badges[bp.badge_id].nama,
                "ikon": badges[bp.badge_id].ikon,
                "tingkat": badges[bp.badge_id].tingkat,
                "diperoleh_pada": bp.diperoleh_pada.isoformat() if bp.diperoleh_pada else None,
            }
            for bp in milik
            if bp.badge_id in badges
        ]

    async def aturan_poin(self, desa_id: UUID) -> list[dict]:
        return [
            {
                "kode_aksi": a.kode_aksi,
                "poin": a.poin,
                "deskripsi": a.deskripsi,
                "aktif": a.aktif,
            }
            for a in await self.store.aturan_poin.daftar_aktif(desa_id)
        ]

    async def daftar_bidang_usaha(self) -> list[dict]:
        return [
            {"id": b.id, "kode": b.kode, "nama": b.nama, "ikon": b.ikon}
            for b in await self.store.bidang_usaha.daftar()
        ]
