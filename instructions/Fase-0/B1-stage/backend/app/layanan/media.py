"""Media (MinIO presigned) + lampiran polimorfik (async)."""
from __future__ import annotations

from uuid import UUID

from ..domain import konteks as ctx
from ..domain import rbac
from ..domain.entitas import Lampiran, Media
from ..domain.enums import EntitasLampiran, TipeMedia
from ..domain.errors import KesalahanValidasi, TidakDitemukan


class MediaLayanan:
    def __init__(self, store):
        self.store = store

    async def presign(self, konteks: ctx.Konteks, desa_id: UUID, nama_berkas: str, mime: str, ukuran: int) -> dict:
        ctx.wajib(konteks, rbac.UNGGAH_MEDIA, desa_id)
        if ukuran <= 0:
            raise KesalahanValidasi("ukuran berkas tidak valid")
        objek = f"{desa_id}/{nama_berkas}"
        m = Media(desa_id=desa_id, objek_minio=objek, tipe=TipeMedia.foto, mime=mime,
                  ukuran=ukuran, diunggah_oleh=konteks.pengguna_id, dikonfirmasi=False)
        await self.store.media.tambah(m)
        url = await self.store.objek.presign_put(objek)
        return {"media_id": m.id, "objek_minio": objek, "url_unggah": url, "kedaluwarsa_dalam": 600}

    async def konfirmasi(self, konteks: ctx.Konteks, desa_id: UUID, media_id: UUID, tipe: TipeMedia, **meta) -> Media:
        ctx.wajib(konteks, rbac.UNGGAH_MEDIA, desa_id)
        m = await self.store.media.ambil(media_id)
        if m is None or m.desa_id != desa_id:
            raise TidakDitemukan("media tidak ditemukan")
        if not await self.store.objek.ada(m.objek_minio):
            raise KesalahanValidasi("objek belum diunggah ke MinIO")
        m.tipe = tipe
        m.dikonfirmasi = True
        m.url = f"https://minio.local/{m.objek_minio}"
        for k in ("lebar", "tinggi", "alt"):
            if k in meta:
                setattr(m, k, meta[k])
        return m

    async def tempel(self, konteks: ctx.Konteks, desa_id: UUID, media_id: UUID,
                     entitas_tipe: EntitasLampiran, entitas_id: UUID, urutan: int = 0,
                     utama: bool = False) -> Lampiran:
        ctx.wajib(konteks, rbac.KELOLA_LAMPIRAN, desa_id)
        m = await self.store.media.ambil(media_id)
        if m is None or m.desa_id != desa_id:
            raise TidakDitemukan("media tidak ditemukan")
        if utama:
            for lain in await self.store.lampiran.daftar_entitas(entitas_tipe, entitas_id):
                lain.utama = False
        l = Lampiran(media_id=media_id, entitas_tipe=entitas_tipe, entitas_id=entitas_id,
                     urutan=urutan, utama=utama)
        return await self.store.lampiran.tambah(l)

    async def set_utama(self, konteks: ctx.Konteks, desa_id: UUID, lampiran_id: UUID) -> Lampiran:
        ctx.wajib(konteks, rbac.KELOLA_LAMPIRAN, desa_id)
        l = await self.store.lampiran.ambil(lampiran_id)
        if l is None:
            raise TidakDitemukan("lampiran tidak ditemukan")
        for lain in await self.store.lampiran.daftar_entitas(l.entitas_tipe, l.entitas_id):
            lain.utama = lain.id == lampiran_id
        return l
