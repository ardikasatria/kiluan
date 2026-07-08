"""Router destinasi — /desa/{slug}/destinasi (Kontrak API F0 §4–5)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel

from app.api import bantu
from app.api.deps import get_penyimpanan, konteks_saat_ini, resolusi_desa, wajib_peran
from app.domain import rbac
from app.domain.enums import EntitasLampiran, StatusKonten
from app.domain.errors import TidakDitemukan
from app.layanan.destinasi import DestinasiLayanan
from app.layanan.discovery import LayananWisataLayanan
from app.layanan.kalender import KalenderLayanan
from app.layanan.media import MediaLayanan
from app.skema.destinasi import DestinasiBuat, DestinasiUbah

router = APIRouter(prefix="/api/v1/desa/{slug}/destinasi", tags=["destinasi"])


class StatusReq(BaseModel):
    status: StatusKonten


class TagReq(BaseModel):
    tag_id: list[int]


def _svc(store) -> DestinasiLayanan:
    return DestinasiLayanan(store)


@router.get("")
async def cari(
    kategori: Optional[int] = Query(None, alias="kategori"),
    tag: Optional[str] = None,
    dekat: Optional[str] = None,
    radius_m: Optional[float] = None,
    q: Optional[str] = None,
    batas: int = 20,
    kursor: Optional[str] = None,
    konteks=Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    hasil = await _svc(store).cari(
        konteks, desa_id,
        kategori_id=kategori, tag=tag, q=q,
        dekat=bantu.parse_dekat(dekat), radius_m=radius_m,
        batas=batas, kursor=kursor,
    )
    return {
        "item": [
            {**bantu.destinasi_ringkas(i["destinasi"]), "jarak_m": i["jarak_m"]}
            for i in hasil["item"]
        ],
        "meta": hasil["meta"],
    }


@router.get("/{id_atau_slug}")
async def detail(
    id_atau_slug: str,
    konteks=Depends(konteks_saat_ini),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    d = await _svc(store).detail(konteks, desa_id, bantu.parse_id_atau_slug(id_atau_slug))
    kat = await store.kategori.ambil(d.kategori_id)
    tags = []
    if hasattr(store.destinasi, "tempel_tag"):
        tag_rows = await store.tag.daftar(desa_id)
        kode_set = set(d.tag_kode)
        tags = [bantu.tag_dict(t) for t in tag_rows if t.kode in kode_set]
    else:
        tags = [{"kode": k, "nama": k} for k in d.tag_kode]

    layanan_svc = LayananWisataLayanan(store)
    layanan = await layanan_svc.daftar(konteks, desa_id, destinasi_id=d.id)
    kalender = await KalenderLayanan(store).daftar(konteks, desa_id, destinasi_id=d.id)
    media = await MediaLayanan(store).daftar_entitas_publik(EntitasLampiran.destinasi, d.id)
    penyedia_cache: dict[UUID, dict] = {}

    async def _penyedia(pid):
        if pid is None:
            return None
        if pid not in penyedia_cache:
            p = await store.pengguna.ambil(pid)
            penyedia_cache[pid] = {"id": str(pid), "nama": p.nama} if p else None
        return penyedia_cache[pid]

    return bantu.destinasi_lengkap(
        d,
        kategori=kat,
        tag=tags,
        media=media,
        layanan=[bantu.layanan_dict(l, await _penyedia(l.penyedia_id)) for l in layanan],
        kalender=[bantu.kalender_dict(k) for k in kalender],
    )


@router.post("", status_code=201)
async def buat(
    req: DestinasiBuat,
    konteks=Depends(wajib_peran(rbac.KELOLA_DESTINASI)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    d = await _svc(store).buat(konteks, desa_id, req)
    return bantu.destinasi_ringkas(d)


@router.patch("/{destinasi_id}")
async def ubah(
    destinasi_id: UUID,
    req: DestinasiUbah,
    konteks=Depends(wajib_peran(rbac.KELOLA_DESTINASI)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    d = await _svc(store).ubah(konteks, desa_id, destinasi_id, req)
    return bantu.destinasi_ringkas(d)


@router.patch("/{destinasi_id}/status")
async def ubah_status(
    destinasi_id: UUID,
    req: StatusReq,
    konteks=Depends(wajib_peran(rbac.KELOLA_DESTINASI)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    d = await _svc(store).ubah_status(konteks, desa_id, destinasi_id, req.status)
    return bantu.destinasi_ringkas(d)


@router.delete("/{destinasi_id}", status_code=204)
async def hapus(
    destinasi_id: UUID,
    konteks=Depends(wajib_peran(rbac.KELOLA_DESTINASI)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    await _svc(store).hapus(konteks, desa_id, destinasi_id)
    return Response(status_code=204)


@router.post("/{destinasi_id}/tag", status_code=204)
async def tempel_tag(
    destinasi_id: UUID,
    req: TagReq,
    konteks=Depends(wajib_peran(rbac.KELOLA_DESTINASI)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    await _svc(store)._ambil_milik(desa_id, destinasi_id, publik=False)  # noqa: SLF001
    if not hasattr(store.destinasi, "tempel_tag"):
        raise TidakDitemukan("fitur tag belum tersedia")
    await store.destinasi.tempel_tag(destinasi_id, req.tag_id)
    return Response(status_code=204)


@router.delete("/{destinasi_id}/tag/{tag_id}", status_code=204)
async def lepas_tag(
    destinasi_id: UUID,
    tag_id: int,
    konteks=Depends(wajib_peran(rbac.KELOLA_DESTINASI)),
    desa_id: UUID = Depends(resolusi_desa),
    store=Depends(get_penyimpanan),
):
    await _svc(store)._ambil_milik(desa_id, destinasi_id, publik=False)  # noqa: SLF001
    if not hasattr(store.destinasi, "lepas_tag"):
        raise TidakDitemukan("fitur tag belum tersedia")
    await store.destinasi.lepas_tag(destinasi_id, tag_id)
    return Response(status_code=204)
