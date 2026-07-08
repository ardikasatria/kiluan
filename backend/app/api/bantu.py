"""Serialisasi response API destinasi & terkait."""
from __future__ import annotations

from datetime import date, datetime, time
from typing import Any
from uuid import UUID


def _ts(v: datetime | None) -> str | None:
    return v.isoformat() if v else None


def _t(v: time | None) -> str | None:
    return v.isoformat() if v else None


def _d(v: date | None) -> str | None:
    return v.isoformat() if v else None


def lokasi_dict(lat_lng: tuple[float, float] | None) -> dict | None:
    if lat_lng is None:
        return None
    return {"lat": lat_lng[0], "lng": lat_lng[1]}


def destinasi_ringkas(d) -> dict:
    return {
        "id": str(d.id),
        "slug": d.slug,
        "nama": d.nama,
        "kategori_id": d.kategori_id,
        "lokasi": lokasi_dict(d.lokasi),
        "status": d.status,
        "alamat": d.alamat,
    }


def destinasi_lengkap(d, *, kategori=None, tag=None, media=None, layanan=None, kalender=None) -> dict:
    out = destinasi_ringkas(d)
    out.update({
        "deskripsi": d.deskripsi,
        "area": getattr(d, "area", None),
        "jam_operasional": d.jam_operasional,
        "tag": tag or [],
        "media": media or [],
        "layanan": layanan or [],
        "kalender": kalender or [],
        "dibuat_pada": _ts(getattr(d, "dibuat_pada", None)),
        "diperbarui_pada": _ts(getattr(d, "diperbarui_pada", None)),
    })
    if kategori is not None:
        out["kategori"] = {
            "id": kategori.id,
            "kode": kategori.kode,
            "nama": kategori.nama,
        }
    return out


def layanan_dict(l, penyedia=None) -> dict:
    return {
        "id": str(l.id),
        "nama": l.nama,
        "jenis": l.jenis,
        "deskripsi": l.deskripsi,
        "harga": l.harga,
        "satuan_harga": l.satuan_harga,
        "destinasi_id": str(l.destinasi_id) if l.destinasi_id else None,
        "penyedia": penyedia,
        "ketersediaan": l.ketersediaan,
        "status": l.status,
    }


def kalender_dict(k) -> dict:
    return {
        "id": str(k.id),
        "judul": k.judul,
        "tipe": k.tipe,
        "destinasi_id": str(k.destinasi_id) if k.destinasi_id else None,
        "waktu_mulai": _t(k.waktu_mulai),
        "waktu_selesai": _t(k.waktu_selesai),
        "pengulangan": k.pengulangan,
        "berlaku_mulai": _d(k.berlaku_mulai),
        "berlaku_sampai": _d(k.berlaku_sampai),
        "status": k.status,
    }


def tag_dict(t) -> dict:
    return {"id": t.id, "kode": t.kode, "nama": t.nama}


def media_dict(m) -> dict:
    tipe = m.tipe.value if hasattr(m.tipe, "value") else m.tipe
    return {
        "id": str(m.id),
        "url": m.url,
        "tipe": tipe,
        "mime": m.mime,
        "ukuran": m.ukuran,
        "lebar": m.lebar,
        "tinggi": m.tinggi,
        "alt": m.alt,
        "dibuat_pada": _ts(getattr(m, "dibuat_pada", None)),
    }


def lampiran_dict(l, media) -> dict:
    return {
        "id": str(l.id),
        "media": media_dict(media),
        "entitas_tipe": l.entitas_tipe.value if hasattr(l.entitas_tipe, "value") else l.entitas_tipe,
        "entitas_id": str(l.entitas_id),
        "urutan": l.urutan,
        "utama": l.utama,
    }


def parse_id_atau_slug(v: str) -> UUID | str:
    try:
        return UUID(v)
    except ValueError:
        return v


def parse_dekat(v: str | None) -> tuple[float, float] | None:
    if not v:
        return None
    bagian = v.split(",", 1)
    if len(bagian) != 2:
        return None
    return float(bagian[0].strip()), float(bagian[1].strip())
