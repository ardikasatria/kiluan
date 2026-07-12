"""Media (MinIO presigned) + lampiran polimorfik (async)."""
from __future__ import annotations

import re
import uuid
from uuid import UUID

from ..domain import konteks as ctx
from ..domain import rbac
from ..domain.entitas import Lampiran, Media
from ..domain.enums import EntitasLampiran, TipeMedia
from ..domain.errors import KesalahanValidasi, TidakDitemukan
from ..inti.minio import url_publik_objek

_NAMA_BERKAS_RE = re.compile(r"[^\w.\-()+]")


class MediaLayanan:
    def __init__(self, store):
        self.store = store

    async def _media_milik(self, desa_id: UUID, media_id: UUID):
        m = await self.store.media.ambil(media_id)
        if m is None or m.desa_id != desa_id:
            raise TidakDitemukan("media tidak ditemukan")
        return m

    async def _lampiran_milik(self, desa_id: UUID, lampiran_id: UUID):
        l = await self.store.lampiran.ambil(lampiran_id)
        if l is None:
            raise TidakDitemukan("lampiran tidak ditemukan")
        await self._media_milik(desa_id, l.media_id)
        return l

    async def presign(self, konteks: ctx.Konteks, desa_id: UUID, nama_berkas: str, mime: str, ukuran: int) -> dict:
        ctx.wajib(konteks, rbac.UNGGAH_MEDIA, desa_id)
        if ukuran <= 0:
            raise KesalahanValidasi("ukuran berkas tidak valid")
        if ukuran > 20 * 1024 * 1024:
            raise KesalahanValidasi("ukuran berkas melebihi batas 20 MB")
        dasar = (nama_berkas or "upload").split("/")[-1].split("\\")[-1].strip() or "upload"
        aman = _NAMA_BERKAS_RE.sub("_", dasar)[:120] or "upload"
        objek = f"{desa_id}/{uuid.uuid4().hex}_{aman}"
        m = Media(desa_id=desa_id, objek_minio=objek, tipe=TipeMedia.foto, mime=mime,
                  ukuran=ukuran, diunggah_oleh=konteks.pengguna_id, dikonfirmasi=False)
        await self.store.media.tambah(m)
        try:
            url = await self.store.objek.presign_put(objek)
        except Exception as exc:
            raise KesalahanValidasi("penyimpanan media tidak tersedia — coba lagi nanti") from exc
        return {"media_id": m.id, "objek_minio": objek, "url_unggah": url, "kedaluwarsa_dalam": 600}

    async def konfirmasi(self, konteks: ctx.Konteks, desa_id: UUID, media_id: UUID, tipe: TipeMedia, **meta) -> Media:
        ctx.wajib(konteks, rbac.UNGGAH_MEDIA, desa_id)
        m = await self._media_milik(desa_id, media_id)
        if not await self.store.objek.ada(m.objek_minio):
            raise KesalahanValidasi("objek belum diunggah ke MinIO")
        m.tipe = tipe
        m.url = url_publik_objek(m.objek_minio)
        if isinstance(m, Media):
            m.dikonfirmasi = True
        for k in ("lebar", "tinggi", "alt"):
            if k in meta:
                setattr(m, k, meta[k])
        return m

    async def ambil(self, konteks: ctx.Konteks, desa_id: UUID, media_id: UUID) -> Media:
        ctx.wajib(konteks, rbac.UNGGAH_MEDIA, desa_id)
        return await self._media_milik(desa_id, media_id)

    async def hapus_media(self, konteks: ctx.Konteks, desa_id: UUID, media_id: UUID) -> None:
        ctx.wajib(konteks, rbac.UNGGAH_MEDIA, desa_id)
        m = await self._media_milik(desa_id, media_id)
        if hasattr(self.store.objek, "hapus"):
            await self.store.objek.hapus(m.objek_minio)
        await self.store.media.hapus(media_id)

    async def tempel(self, konteks: ctx.Konteks, desa_id: UUID, media_id: UUID,
                     entitas_tipe: EntitasLampiran, entitas_id: UUID, urutan: int = 0,
                     utama: bool = False) -> Lampiran:
        ctx.wajib(konteks, rbac.KELOLA_LAMPIRAN, desa_id)
        m = await self._media_milik(desa_id, media_id)
        if not m.dikonfirmasi:
            raise KesalahanValidasi("media belum dikonfirmasi")
        if utama:
            for lain in await self.store.lampiran.daftar_entitas(entitas_tipe, entitas_id):
                lain.utama = False
        l = Lampiran(media_id=media_id, entitas_tipe=entitas_tipe, entitas_id=entitas_id,
                     urutan=urutan, utama=utama)
        return await self.store.lampiran.tambah(l)

    async def set_utama(self, konteks: ctx.Konteks, desa_id: UUID, lampiran_id: UUID) -> Lampiran:
        ctx.wajib(konteks, rbac.KELOLA_LAMPIRAN, desa_id)
        l = await self._lampiran_milik(desa_id, lampiran_id)
        for lain in await self.store.lampiran.daftar_entitas(l.entitas_tipe, l.entitas_id):
            lain.utama = lain.id == lampiran_id
        return l

    async def ubah_lampiran(self, konteks: ctx.Konteks, desa_id: UUID, lampiran_id: UUID, *,
                            urutan: int | None = None, utama: bool | None = None) -> Lampiran:
        ctx.wajib(konteks, rbac.KELOLA_LAMPIRAN, desa_id)
        l = await self._lampiran_milik(desa_id, lampiran_id)
        if urutan is not None:
            l.urutan = urutan
        if utama is True:
            for lain in await self.store.lampiran.daftar_entitas(l.entitas_tipe, l.entitas_id):
                lain.utama = lain.id == lampiran_id
        elif utama is False:
            l.utama = False
        return l

    async def hapus_lampiran(self, konteks: ctx.Konteks, desa_id: UUID, lampiran_id: UUID) -> None:
        ctx.wajib(konteks, rbac.KELOLA_LAMPIRAN, desa_id)
        await self._lampiran_milik(desa_id, lampiran_id)
        await self.store.lampiran.hapus(lampiran_id)

    async def daftar_entitas_publik(self, entitas_tipe: EntitasLampiran, entitas_id: UUID) -> list[dict]:
        """Media dikonfirmasi terlampir pada entitas, urut + flag utama (tanpa auth)."""
        lampiran = await self.store.lampiran.daftar_entitas(entitas_tipe, entitas_id)
        lampiran.sort(key=lambda x: (not x.utama, x.urutan))
        hasil: list[dict] = []
        for lam in lampiran:
            m = await self.store.media.ambil(lam.media_id)
            if m is None or not m.dikonfirmasi or not m.url:
                continue
            hasil.append({
                "id": str(m.id),
                "lampiran_id": str(lam.id),
                "url": m.url,
                "tipe": _v(m.tipe),
                "mime": m.mime,
                "ukuran": m.ukuran,
                "lebar": m.lebar,
                "tinggi": m.tinggi,
                "alt": m.alt,
                "utama": lam.utama,
                "urutan": lam.urutan,
                "dibuat_pada": (
                    m.dibuat_pada.isoformat()
                    if getattr(m, "dibuat_pada", None) is not None
                    else None
                ),
            })
        return hasil


def _v(x):
    return x.value if hasattr(x, "value") else x
