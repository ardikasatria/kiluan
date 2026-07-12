"""Serialisasi DTO F2 untuk respons API (ORM + dataclass scaffold)."""
from __future__ import annotations

from decimal import Decimal
from typing import Any


def _dec(v: Decimal | float | int | None) -> float | None:
    if v is None:
        return None
    return float(v)


def _tanggal(v) -> str | None:
    if v is None:
        return None
    return v.isoformat() if hasattr(v, "isoformat") else str(v)


def pesanan_ringkas(p) -> dict[str, Any]:
    return {
        "id": str(p.id),
        "kode_pesanan": p.kode_pesanan,
        "status": p.status,
        "subtotal": _dec(p.subtotal),
        "diskon": _dec(p.diskon),
        "ongkir": _dec(p.ongkir),
        "total": _dec(p.total),
        "kedaluwarsa_pada": p.kedaluwarsa_pada.isoformat() if p.kedaluwarsa_pada else None,
        "dibuat_pada": p.dibuat_pada.isoformat() if hasattr(p.dibuat_pada, "isoformat") else str(p.dibuat_pada),
    }


def pesanan_item(it, booking=None) -> dict[str, Any]:
    meta = getattr(it, "metadata_item", None) or getattr(it, "metadata", {}) or {}
    row = {
        "id": str(it.id),
        "item_tipe": it.item_tipe,
        "item_id": str(it.item_id),
        "nama_snapshot": it.nama_snapshot,
        "harga_snapshot": _dec(it.harga_snapshot),
        "jumlah": it.jumlah,
        "satuan": getattr(it, "satuan", "pcs"),
        "subtotal": _dec(it.subtotal),
        "penyedia": {"tipe": it.penyedia_tipe, "id": str(it.penyedia_id), "nama": None},
        "status_fulfillment": it.status_fulfillment,
        "metadata": meta,
        "booking": None,
    }
    if booking:
        row["booking"] = {
            "id": str(booking.id),
            "kode_checkin": booking.kode_checkin,
            "status": booking.status,
        }
    return row


def pesanan_detail(p, items: list, bmap: dict | None = None) -> dict[str, Any]:
    bmap = bmap or {}
    out = pesanan_ringkas(p)
    out.update({
        "metode_ambil": p.metode_ambil,
        "kontak": p.kontak or {},
        "item": [pesanan_item(it, bmap.get(it.id)) for it in items],
    })
    return out


def pembayaran_dto(p) -> dict[str, Any]:
    return {
        "id": str(p.id),
        "metode": p.metode,
        "penyedia_gateway": p.penyedia_gateway,
        "jumlah": _dec(p.jumlah),
        "status": p.status,
        "redirect_url": p.redirect_url,
        "bukti_media_id": str(p.bukti_media_id) if p.bukti_media_id else None,
        "kedaluwarsa_pada": p.kedaluwarsa_pada.isoformat() if p.kedaluwarsa_pada else None,
        "dibayar_pada": p.dibayar_pada.isoformat() if p.dibayar_pada else None,
    }


def slot_dto(s) -> dict[str, Any]:
    sisa = getattr(s, "sisa", None)
    if sisa is None and hasattr(s, "kuota"):
        sisa = s.kuota - s.kuota_terpakai
    return {
        "id": str(s.id),
        "subjek_tipe": s.subjek_tipe,
        "subjek_id": str(s.subjek_id),
        "tanggal": _tanggal(s.tanggal),
        "waktu_mulai": str(s.waktu_mulai) if s.waktu_mulai else None,
        "kuota": s.kuota,
        "sisa": sisa,
        "harga_override": _dec(s.harga_override),
        "status": s.status,
    }


def mask_nomor(nomor: str) -> str:
    if len(nomor) <= 4:
        return "••••" + nomor
    return "••••" + nomor[-4:]


def transaksi_dto(t) -> dict[str, Any]:
    return {
        "id": str(t.id),
        "pesanan_id": str(t.pesanan_id),
        "penyedia": {"tipe": t.penyedia_tipe, "id": str(t.penyedia_id)},
        "jenis": t.jenis,
        "bruto": _dec(t.bruto),
        "fee_platform": _dec(t.fee_platform),
        "porsi_reinvestasi": _dec(t.porsi_reinvestasi),
        "neto_penyedia": _dec(t.neto_penyedia),
        "status": t.status,
        "payout_id": str(t.payout_id) if t.payout_id else None,
        "dibuat_pada": t.dibuat_pada.isoformat() if hasattr(t.dibuat_pada, "isoformat") else str(t.dibuat_pada),
    }


def payout_dto(p, rekening=None) -> dict[str, Any]:
    row = {
        "id": str(p.id),
        "penyedia": {"tipe": p.penyedia_tipe, "id": str(p.penyedia_id)},
        "jumlah": _dec(p.jumlah),
        "metode": p.metode,
        "status": p.status,
        "ref_eksternal": p.ref_eksternal,
        "catatan": p.catatan,
        "dibuat_pada": p.dibuat_pada.isoformat() if hasattr(p.dibuat_pada, "isoformat") else str(p.dibuat_pada),
        "diproses_pada": p.diproses_pada.isoformat() if p.diproses_pada else None,
        "rekening": None,
    }
    if rekening:
        row["rekening"] = {
            "jenis": rekening.jenis,
            "nomor_mask": mask_nomor(rekening.nomor),
        }
    return row


def refund_dto(r) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "pesanan_id": str(r.pesanan_id),
        "alasan": r.alasan,
        "jumlah": _dec(r.jumlah),
        "status": r.status,
        "dibuat_pada": r.dibuat_pada.isoformat() if hasattr(r.dibuat_pada, "isoformat") else str(r.dibuat_pada),
        "selesai_pada": r.selesai_pada.isoformat() if r.selesai_pada else None,
    }


def rekening_dto(r) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "penyedia": {"tipe": r.penyedia_tipe, "id": str(r.penyedia_id)},
        "jenis": r.jenis,
        "bank_kode": r.bank_kode,
        "nomor_mask": mask_nomor(r.nomor),
        "nama_pemilik": r.nama_pemilik,
        "terverifikasi": r.terverifikasi,
        "utama": r.utama,
    }


def pengaturan_dto(p) -> dict[str, Any]:
    return {
        "persen_reinvestasi": _dec(p.persen_reinvestasi),
        "persen_fee_platform": _dec(p.persen_fee_platform),
        "batas_hold_menit": p.batas_hold_menit,
        "gateway": p.gateway,
        "kebijakan_pembatalan": p.kebijakan_pembatalan or {},
    }


def booking_dto(b, slot=None) -> dict[str, Any]:
    return {
        "id": str(b.id),
        "kode_checkin": b.kode_checkin,
        "slot_jadwal": {
            "id": str(b.slot_jadwal_id),
            "tanggal": _tanggal(slot.tanggal) if slot else None,
            "waktu_mulai": str(slot.waktu_mulai) if slot and slot.waktu_mulai else None,
        },
        "jumlah_orang": b.jumlah_orang,
        "tanggal_kunjungan": _tanggal(b.tanggal_kunjungan),
        "status": b.status,
        "checkin_pada": b.checkin_pada.isoformat() if b.checkin_pada else None,
    }


def hadiah_dto(h) -> dict[str, Any]:
    return {
        "id": str(h.id),
        "kode": h.kode,
        "nama": h.nama,
        "deskripsi": h.deskripsi,
        "jenis": h.jenis,
        "biaya_poin": h.biaya_poin,
        "stok": h.stok,
        "syarat": h.syarat or {},
        "aktif": h.aktif,
    }


def kupon_dto(k) -> dict[str, Any]:
    return {
        "id": str(k.id),
        "kode": k.kode,
        "sumber": k.sumber,
        "tipe_diskon": k.tipe_diskon,
        "nilai": _dec(k.nilai),
        "min_belanja": _dec(k.min_belanja),
        "batas_pakai": k.batas_pakai,
        "terpakai": k.terpakai,
        "status": k.status,
        "penyedia_terbatas": k.penyedia_terbatas,
        "pemilik_id": str(k.pemilik_id) if k.pemilik_id else None,
    }


def penukaran_dto(p) -> dict[str, Any]:
    return {
        "id": str(p.id),
        "hadiah_id": str(p.hadiah_id),
        "poin_dipakai": p.poin_dipakai,
        "kupon_id": str(p.kupon_id) if p.kupon_id else None,
        "status": p.status,
        "dibuat_pada": p.dibuat_pada.isoformat() if hasattr(p.dibuat_pada, "isoformat") else str(p.dibuat_pada),
    }


def misi_ringkas(m, stasiun_nama: str | None = None) -> dict[str, Any]:
    row = {
        "id": str(m.id),
        "kode": m.kode,
        "judul": m.judul,
        "jenis": m.jenis,
        "kategori": m.kategori,
        "poin": m.poin,
        "aktif": m.aktif,
    }
    if stasiun_nama:
        row["stasiun"] = {"id": str(m.stasiun_id), "nama": stasiun_nama} if m.stasiun_id else None
    return row


def misi_detail(m, stasiun_nama: str | None = None) -> dict[str, Any]:
    row = misi_ringkas(m, stasiun_nama)
    row.update({
        "deskripsi": m.deskripsi,
        "micro_lesson": m.micro_lesson,
        "syarat_verifikasi": m.syarat_verifikasi or {},
        "dampak_template": m.dampak_template or {},
    })
    return row


def stasiun_dto(s, lat: float | None = None, lng: float | None = None, tampilkan_qr: bool = False) -> dict[str, Any]:
    row = {
        "id": str(s.id),
        "nama": s.nama,
        "tipe": s.tipe,
        "radius_m": s.radius_m,
        "aktif": s.aktif,
        "destinasi_id": str(s.destinasi_id) if s.destinasi_id else None,
    }
    if lat is not None and lng is not None:
        row["lokasi"] = {"lat": lat, "lng": lng}
    if tampilkan_qr:
        row["qr_token"] = s.qr_token
    return row


def stempel_dto(s, misi_judul: str | None = None, stasiun_nama: str | None = None) -> dict[str, Any]:
    row = {
        "id": str(s.id),
        "misi_id": str(s.misi_id),
        "status": s.status,
        "dampak": s.dampak or {},
        "dibuat_pada": s.dibuat_pada.isoformat() if hasattr(s.dibuat_pada, "isoformat") else str(s.dibuat_pada),
        "booking_id": str(s.booking_id) if s.booking_id else None,
        "media_id": str(s.media_id) if s.media_id else None,
    }
    if misi_judul:
        row["misi"] = {"id": str(s.misi_id), "judul": misi_judul}
    if s.stasiun_id and stasiun_nama:
        row["stasiun"] = {"id": str(s.stasiun_id), "nama": stasiun_nama}
    return row


def paspor_dto(p, stempel: list | None = None, misi_map: dict | None = None) -> dict[str, Any]:
    misi_map = misi_map or {}
    st_list = []
    for s in stempel or []:
        mid = str(s.misi_id)
        st_list.append(stempel_dto(s, misi_judul=misi_map.get(mid)))
    return {
        "id": str(p.id),
        "ringkasan_dampak": p.ringkasan_dampak or {},
        "total_stempel": p.total_stempel,
        "diperbarui_pada": p.diperbarui_pada.isoformat() if hasattr(p.diperbarui_pada, "isoformat") else str(p.diperbarui_pada),
        "stempel": st_list,
    }


def verifikasi_dto(v) -> dict[str, Any]:
    return {
        "id": str(v.id),
        "entitas_tipe": v.entitas_tipe,
        "entitas_id": str(v.entitas_id),
        "metode": v.metode,
        "hasil": v.hasil,
        "verifikator_id": str(v.verifikator_id) if v.verifikator_id else None,
        "dibuat_pada": v.dibuat_pada.isoformat() if hasattr(v.dibuat_pada, "isoformat") else str(v.dibuat_pada),
        "diputuskan_pada": v.diputuskan_pada.isoformat() if v.diputuskan_pada else None,
        "bukti": v.bukti or {},
        "syarat": v.syarat or {},
    }


def sesi_pemandu_dto(s, percakapan: list | None = None) -> dict[str, Any]:
    row = {
        "id": str(s.id),
        "tipe": s.tipe,
        "masukan": s.masukan or {},
        "keluaran": s.keluaran,
        "model_dipakai": s.model_dipakai,
        "dibuat_pada": s.dibuat_pada.isoformat() if hasattr(s.dibuat_pada, "isoformat") else str(s.dibuat_pada),
    }
    if percakapan is not None:
        row["percakapan"] = [
            {
                "id": str(p.id),
                "peran": p.peran,
                "isi": p.isi,
                "sumber": p.sumber,
                "dibuat_pada": p.dibuat_pada.isoformat() if hasattr(p.dibuat_pada, "isoformat") else str(p.dibuat_pada),
            }
            for p in percakapan
        ]
    return row
