"""Genta — inbox notifikasi per pengguna (KONTRAK addendum F2 §B.1)."""
from __future__ import annotations

from uuid import UUID

from app.domain.errors import TidakBerwenang, TidakDitemukan, TidakTerautentikasi
from app.domain.konteks import Konteks
from app.domain.paginasi import keyset


class GentaLayanan:
    def __init__(self, store):
        self.store = store

    def _wajib_login(self, konteks: Konteks) -> UUID:
        if konteks.anonim or konteks.pengguna_id is None:
            raise TidakTerautentikasi("perlu masuk terlebih dahulu")
        return konteks.pengguna_id

    async def inbox(
        self,
        konteks: Konteks,
        desa_id: UUID,
        *,
        status: str | None = None,
        kursor: str | None = None,
        batas: int = 20,
    ) -> dict:
        pengguna_id = self._wajib_login(konteks)
        rows = await self.store.notifikasi.daftar_inbox(
            desa_id, pengguna_id, status=status,
        )
        hal = keyset(rows, batas=batas, kursor=kursor)
        return {
            "item": [self._dto(n) for n in hal.item],
            "meta": hal.meta(),
        }

    async def hitung(self, konteks: Konteks, desa_id: UUID) -> dict:
        pengguna_id = self._wajib_login(konteks)
        jumlah = await self.store.notifikasi.hitung_belum_dibaca(desa_id, pengguna_id)
        return {"belum_dibaca": jumlah}

    async def baca(self, konteks: Konteks, desa_id: UUID, id_: UUID) -> dict:
        pengguna_id = self._wajib_login(konteks)
        n = await self.store.notifikasi.ambil(id_)
        if n is None or n.desa_id != desa_id:
            raise TidakDitemukan("Notifikasi tak ditemukan.")
        if n.penerima_id != pengguna_id:
            raise TidakBerwenang("Hanya pemilik inbox.")
        hasil = await self.store.notifikasi.tandai_dibaca(id_, pengguna_id)
        if hasil is None:
            raise TidakDitemukan("Notifikasi tak ditemukan.")
        return self._dto(hasil)

    async def baca_semua(self, konteks: Konteks, desa_id: UUID) -> dict:
        pengguna_id = self._wajib_login(konteks)
        jumlah = await self.store.notifikasi.tandai_semua_dibaca(desa_id, pengguna_id)
        return {"ditandai": jumlah}

    def _dto(self, n) -> dict:
        return {
            "id": str(n.id),
            "tipe": n.tipe,
            "judul": n.judul,
            "isi": n.isi,
            "entitas_tipe": n.entitas_tipe,
            "entitas_id": str(n.entitas_id),
            "status": n.status,
            "dibuat_pada": n.dibuat_pada.isoformat() if n.dibuat_pada else None,
            "dibaca_pada": n.dibaca_pada.isoformat() if n.dibaca_pada else None,
        }
