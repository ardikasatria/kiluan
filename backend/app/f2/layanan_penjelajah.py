"""Penjelajah Lestari: selesaikan misi → stempel+verifikasi, geofence, paspor.
Hanya stempel terverifikasi yang masuk paspor (pintu anti-greenwashing)."""
from __future__ import annotations

import math

from . import enums, errors
from .clock import Jam, id_baru
from .models import PasporLestari, Stempel, Verifikasi
from .repos import Basis


def _jarak_m(lat1, lng1, lat2, lng2) -> float:
    """Haversine — emulasi ST_DWithin."""
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class PenjelajahService:
    def __init__(self, basis: Basis, jam: Jam) -> None:
        self.b = basis
        self.jam = jam

    async def _paspor(self, desa_id, pengguna_id) -> PasporLestari:
        for p in await self.b.paspor.daftar(desa_id, pengguna_id=pengguna_id):
            return p
        p = PasporLestari(id_baru(), desa_id, pengguna_id, self.jam.now())
        await self.b.paspor.simpan(p)
        return p

    async def _bump(self, stempel: Stempel):
        paspor = await self.b.paspor.ambil(stempel.paspor_id, stempel.desa_id)
        for k, v in stempel.dampak.items():
            paspor.ringkasan_dampak[k] = paspor.ringkasan_dampak.get(k, 0) + v
        paspor.total_stempel += 1
        paspor.diperbarui_pada = self.jam.now()

    async def selesaikan_misi(self, desa_id, aktor, misi_id, bukti=None, dampak=None,
                              booking_id=None):
        misi = await self.b.misi.ambil(misi_id, desa_id)
        if misi is None or not misi.aktif:
            raise errors.tidak_ditemukan("Misi tak tersedia.")
        bukti = bukti or {}
        syarat = misi.syarat_verifikasi or {}
        metode = syarat.get("metode", "otomatis")
        paspor = await self._paspor(desa_id, aktor.pengguna_id)
        lat, lng = (bukti.get("lokasi") or {}).get("lat"), (bukti.get("lokasi") or {}).get("lng")

        stempel = Stempel(
            id=id_baru(), desa_id=desa_id, paspor_id=paspor.id, misi_id=misi_id,
            dampak=dampak or dict(misi.dampak_template), dibuat_pada=self.jam.now(),
            booking_id=booking_id, stasiun_id=misi.stasiun_id, lat=lat, lng=lng,
            media_id=bukti.get("foto_media_id"),
        )
        verif = Verifikasi(
            id=id_baru(), desa_id=desa_id, entitas_tipe="stempel", entitas_id=stempel.id,
            metode=metode, dibuat_pada=self.jam.now(),
        )

        # bukti wajib
        if syarat.get("bukti", {}).get("foto") and not bukti.get("foto_media_id"):
            raise errors.bukti_kurang()

        if metode == "otomatis":
            verif.hasil = "valid"
        elif metode == "qr_checkin":
            stasiun = await self.b.stasiun.ambil(misi.stasiun_id, desa_id)
            if stasiun is None or bukti.get("qr_token") != stasiun.qr_token:
                raise errors.bukti_kurang()
            if lat is None or lng is None:
                raise errors.bukti_kurang()
            if _jarak_m(lat, lng, stasiun.lat, stasiun.lng) > stasiun.radius_m:
                raise errors.di_luar_geofence()
            verif.hasil = "valid"
        elif metode == "konfirmasi_pemandu":
            verif.hasil = "menunggu"  # tunggu putuskan()
        else:
            verif.hasil = "menunggu"

        if verif.hasil == "valid":
            verif.diputuskan_pada = self.jam.now()
            stempel.status = "terverifikasi"
        await self.b.stempel.simpan(stempel)
        await self.b.verifikasi.simpan(verif)
        if stempel.status == "terverifikasi":
            await self._bump(stempel)
        return {"stempel": stempel, "verifikasi": verif}

    async def putuskan_verifikasi(self, desa_id, aktor, verifikasi_id, hasil, catatan=""):
        if not aktor.punya(*enums.VERIFIKATOR):
            raise errors.tidak_berwenang("Bukan verifikator berwenang.")
        v = await self.b.verifikasi.wajib(verifikasi_id, desa_id)
        if v.hasil != "menunggu":
            raise errors.transisi_ilegal("Verifikasi sudah diputus.")
        if hasil not in ("valid", "invalid"):
            raise errors.validasi_gagal("hasil harus valid|invalid.")
        v.hasil = hasil
        v.verifikator_id = aktor.pengguna_id
        v.diputuskan_pada = self.jam.now()
        stempel = await self.b.stempel.ambil(v.entitas_id, desa_id)
        if hasil == "valid":
            stempel.status = "terverifikasi"
            await self._bump(stempel)
        else:
            stempel.status = "ditolak"
        return v
