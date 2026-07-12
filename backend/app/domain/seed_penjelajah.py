"""Seed Penjelajah Lestari — stasiun & misi demo untuk Desa Teluk Kiluan.

QR token tetap (dev/demo) tercantum di STASIUN[]; rotasi produksi via PATCH stasiun.
Koordinat ≈ Teluk Kiluan (-5.7497, 105.1985).
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

DESA_SLUG = "teluk-kiluan"

# Stasiun (UUID tetap agar migrasi & uji dapat direferensikan)
STASIUN_DERMAGA_ID = UUID("11111111-1111-4111-8111-111111110001")
STASIUN_MANGROVE_ID = UUID("11111111-1111-4111-8111-111111110002")
STASIUN_PANTAI_ID = UUID("11111111-1111-4111-8111-111111110003")

STASIUN: list[dict[str, Any]] = [
    {
        "id": STASIUN_DERMAGA_ID,
        "nama": "Dermaga Lumba Kiluan",
        "tipe": "dermaga",
        "qr_token": "STN-KILUAN-DERMAGA",
        "radius_m": 80,
        "lat": -5.7497,
        "lng": 105.1985,
    },
    {
        "id": STASIUN_MANGROVE_ID,
        "nama": "Titik Tanam Mangrove",
        "tipe": "titik_mangrove",
        "qr_token": "STN-KILUAN-MANGROVE",
        "radius_m": 100,
        "lat": -5.7510,
        "lng": 105.1995,
    },
    {
        "id": STASIUN_PANTAI_ID,
        "nama": "Pos Bersih Pantai",
        "tipe": "pos",
        "qr_token": "STN-KILUAN-PANTAI",
        "radius_m": 100,
        "lat": -5.7485,
        "lng": 105.1970,
    },
]

MICRO_LESSON_LUMBA: dict[str, Any] = {
    "judul": "Etik observasi lumba-lumba",
    "bagian": [
        {
            "judul": "Jarak aman",
            "isi": "Minimal 50 meter dari lumba-lumba — jangan mengejar atau mendekati terlalu dekat.",
        },
        {
            "judul": "Mesin & kebisingan",
            "isi": "Matikan mesin atau gunakan kecepatan rendah saat lumba-lumba terlihat. Hindari suara keras.",
        },
    ],
    "poin_kunci": [
        "Jangan memberi makan lumba-lumba",
        "Patuhi instruksi nelayan/pemandu",
        "Foto/video tanpa flash",
    ],
}

MICRO_LESSON_MANGROVE: dict[str, Any] = {
    "judul": "Kode etik mangrove",
    "bagian": [
        {
            "judul": "Jangan injak akar",
            "isi": "Berjalan hanya di jalur yang ditandai agar bibit dan akar pneumatophore tidak rusak.",
        },
        {
            "judul": "Tanam dengan benar",
            "isi": "Kedalaman lubang sesuai polybag; tutup dengan tanah gembur, jangan padatkan berlebihan.",
        },
    ],
    "poin_kunci": ["Gunakan sarung tangan", "Buang sampah plastik ke tempatnya", "Laporkan kerusakan ke pemandu"],
}

MICRO_LESSON_SAMPAH: dict[str, Any] = {
    "judul": "Etik bersih pantai",
    "bagian": [
        {
            "judul": "Pilah di lapangan",
            "isi": "Pisahkan plastik, kaca, dan organik ke kantong berbeda bila memungkinkan.",
        },
        {
            "judul": "Aman untuk diri & ekosistem",
            "isi": "Jangan mengambil fauna hidup; hati-hati dengan paku, kaca, atau jarum.",
        },
    ],
    "poin_kunci": ["Bawa sarung tangan", "Jangan bakar sampah di pantai", "Catat berat kotoran yang terkumpul"],
}

MISI: list[dict[str, Any]] = [
    {
        "kode": "BL-LUMBA-01",
        "judul": "Etik observasi lumba-lumba",
        "deskripsi": "Micro-lesson wajib sebelum aksi di dermaga — jarak aman, kebisingan, dan interaksi bertanggung jawab.",
        "jenis": "belajar",
        "kategori": "lumba",
        "poin": 20,
        "micro_lesson": MICRO_LESSON_LUMBA,
        "syarat_verifikasi": {"metode": "otomatis"},
        "dampak_template": {},
        "stasiun_id": None,
    },
    {
        "kode": "AK-LUMBA-01",
        "judul": "Check-in dermaga lumba",
        "deskripsi": "Scan QR di Dermaga Lumba Kiluan + verifikasi geofence saat kunjungan wisata bahari.",
        "jenis": "aksi",
        "kategori": "lumba",
        "poin": 50,
        "micro_lesson": None,
        "syarat_verifikasi": {"metode": "qr_checkin"},
        "dampak_template": {"lumba_observasi": 1},
        "stasiun_id": STASIUN_DERMAGA_ID,
    },
    {
        "kode": "BL-MGR-01",
        "judul": "Kode etik mangrove",
        "deskripsi": "Pelajari prinsip regeneratif sebelum ikut tanam bibit di hutan mangrove.",
        "jenis": "belajar",
        "kategori": "mangrove",
        "poin": 20,
        "micro_lesson": MICRO_LESSON_MANGROVE,
        "syarat_verifikasi": {"metode": "otomatis"},
        "dampak_template": {},
        "stasiun_id": None,
    },
    {
        "kode": "AK-MGR-01",
        "judul": "Tanam bibit mangrove",
        "deskripsi": "Aksi tanam di titik mangrove — konfirmasi pemandu/Pokdarwis setelah bukti di lapangan.",
        "jenis": "aksi",
        "kategori": "mangrove",
        "poin": 50,
        "micro_lesson": None,
        "syarat_verifikasi": {"metode": "konfirmasi_pemandu", "bukti": {"foto": True}},
        "dampak_template": {"mangrove": 1},
        "stasiun_id": STASIUN_MANGROVE_ID,
    },
    {
        "kode": "BL-SMP-01",
        "judul": "Etik bersih pantai",
        "deskripsi": "Micro-lesson sebelum aksi pembersihan pantai — pilah sampah dan keselamatan.",
        "jenis": "belajar",
        "kategori": "sampah",
        "poin": 20,
        "micro_lesson": MICRO_LESSON_SAMPAH,
        "syarat_verifikasi": {"metode": "otomatis"},
        "dampak_template": {},
        "stasiun_id": None,
    },
    {
        "kode": "AK-SMP-01",
        "judul": "Bersih pantai Kiluan",
        "deskripsi": "Unggah foto bukti + geolokasi di Pos Bersih Pantai. Dampak dicatat setelah verifikasi otomatis bukti.",
        "jenis": "aksi",
        "kategori": "sampah",
        "poin": 40,
        "micro_lesson": None,
        "syarat_verifikasi": {"metode": "foto_geotag", "bukti": {"foto": True}},
        "dampak_template": {"sampah": 2},
        "stasiun_id": STASIUN_PANTAI_ID,
    },
]

# Kode misi untuk uji integrasi / dokumentasi dev
KODE_MISI_BELAJAR_LUMBA = "BL-LUMBA-01"
KODE_MISI_AKSI_LUMBA = "AK-LUMBA-01"
QR_DERMAGA = "STN-KILUAN-DERMAGA"


def dump_json(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False)


async def isi_penjelajah_desa(sesi, desa_id: UUID) -> dict[str, UUID]:
    """Isi stasiun + misi seed ke desa (uji integrasi / dev tanpa migrasi)."""
    from uuid import uuid4

    from app.model import tabel as M
    from app.repo.f2_sql import _set_lokasi_stasiun

    kode_to_id: dict[str, UUID] = {}
    for st in STASIUN:
        row = M.StasiunLestari(
            id=st["id"],
            desa_id=desa_id,
            nama=st["nama"],
            tipe=st["tipe"],
            qr_token=st["qr_token"],
            radius_m=st["radius_m"],
            aktif=True,
        )
        sesi.add(row)
        await sesi.flush()
        await _set_lokasi_stasiun(sesi, st["id"], st["lat"], st["lng"])

    for m in MISI:
        mid = uuid4()
        sesi.add(
            M.Misi(
                id=mid,
                desa_id=desa_id,
                kode=m["kode"],
                judul=m["judul"],
                deskripsi=m["deskripsi"],
                jenis=m["jenis"],
                kategori=m["kategori"],
                micro_lesson=m["micro_lesson"],
                syarat_verifikasi=m["syarat_verifikasi"],
                stasiun_id=m["stasiun_id"],
                poin=m["poin"],
                dampak_template=m["dampak_template"],
                aktif=True,
            )
        )
        kode_to_id[m["kode"]] = mid
    await sesi.flush()
    return kode_to_id
