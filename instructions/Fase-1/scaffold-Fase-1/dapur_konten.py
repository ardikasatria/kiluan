"""Dapur Konten (KONTRAK §4/§6.2): kontribusi crowdsource + kurasi + award poin idempoten."""
from __future__ import annotations

from uuid import UUID

from .. import enums, mesin_status
from ..errors import TidakBerwenang, TidakDitemukan, ValidasiGagal
from ..ids import sekarang
from ..konteks import Aktor, wajib_pengelola
from ..models import Kontribusi, KurasiLog
from ..repositori import RepoMemori, keyset


class KontribusiService:
    def __init__(self, repo: RepoMemori, repo_log: RepoMemori, poin_service):
        self.repo = repo
        self.log = repo_log
        self.poin = poin_service

    async def kirim(self, aktor: Aktor, desa_id: UUID, data: dict) -> Kontribusi:
        tipe = enums.wajib_enum(data["tipe"], enums.KONTRIBUSI_TIPE, "tipe")
        target_tipe = enums.wajib_enum(
            data["target_tipe"], enums.KONTRIBUSI_TARGET_TIPE, "target_tipe")
        if tipe == "foto" and not data.get("media_id"):
            raise ValidasiGagal("Kontribusi foto wajib menyertakan media_id.",
                                rincian=[{"field": "media_id", "pesan": "wajib"}])
        kontribusi = Kontribusi(
            desa_id=desa_id, penyumbang_id=aktor.pengguna_id, tipe=tipe,
            target_tipe=target_tipe, target_id=data.get("target_id"),
            muatan=data.get("muatan", {}), media_id=data.get("media_id"),
        )
        return await self.repo.simpan(kontribusi)

    async def _ambil(self, desa_id: UUID, id_: UUID) -> Kontribusi:
        k = await self.repo.ambil(id_)
        if k is None or k.desa_id != desa_id:
            raise TidakDitemukan("Kontribusi tak ditemukan.")
        return k

    async def revisi(self, aktor: Aktor, desa_id: UUID, id_: UUID, muatan: dict,
                     media_id: UUID | None = None) -> Kontribusi:
        k = await self._ambil(desa_id, id_)
        if k.penyumbang_id != aktor.pengguna_id:
            raise TidakBerwenang("Hanya penyumbang boleh merevisi.")
        if k.status not in ("menunggu", "revisi"):
            raise ValidasiGagal("Hanya bisa direvisi saat status menunggu/revisi.")
        k.muatan = muatan
        if media_id is not None:
            k.media_id = media_id
        k.diperbarui_pada = sekarang()
        return await self.repo.simpan(k)

    async def transisi(self, aktor: Aktor, desa_id: UUID, id_: UUID,
                       aksi: str, catatan: str = "") -> Kontribusi:
        k = await self._ambil(desa_id, id_)
        if aksi in ("setuju", "tolak", "minta_revisi"):
            wajib_pengelola(aktor, desa_id)
        elif aksi == "ajukan":  # kirim ulang oleh penyumbang
            if k.penyumbang_id != aktor.pengguna_id:
                raise TidakBerwenang("Hanya penyumbang boleh mengirim ulang.")
        dari = k.status
        ke = mesin_status.transisi("kontribusi", dari, aksi)
        k.status = ke
        k.diperbarui_pada = sekarang()
        await self.repo.simpan(k)
        await self.log.simpan(KurasiLog(
            entitas_tipe="kontribusi", entitas_id=k.id, dari_status=dari, ke_status=ke,
            kurator_id=aktor.pengguna_id, keputusan=aksi, catatan=catatan,
        ))
        if ke == "disetujui":
            # award idempoten + terapkan-ke-target (konservatif, KONTRAK §6.2)
            await self.poin.award(desa_id, k.penyumbang_id, "kontribusi_disetujui",
                                  "kontribusi", k.id)
        return k

    async def antrean(self, aktor: Aktor, desa_id: UUID, status=None, kursor=None, batas=20):
        wajib_pengelola(aktor, desa_id)
        rows = await self.repo.cari(desa_id=desa_id)
        if status:
            rows = [r for r in rows if r.status == status]
        return keyset(rows, kursor, batas)

    async def milik_saya(self, aktor: Aktor, desa_id: UUID, kursor=None, batas=20):
        rows = [r for r in await self.repo.cari(desa_id=desa_id)
                if r.penyumbang_id == aktor.pengguna_id]
        return keyset(rows, kursor, batas)
