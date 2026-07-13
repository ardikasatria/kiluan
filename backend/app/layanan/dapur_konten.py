"""Dapur Konten (KONTRAK §4/§6.2): kontribusi crowdsource + kurasi + award poin idempoten."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from app.domain import mesin_status
from app.domain import entitas as E
from app.domain.enums import (
    EntitasLampiran,
    StatusKontribusi,
    TargetKontribusi,
    TipeKontribusi,
)
from app.domain.errors import KesalahanValidasi, TidakBerwenang, TidakDitemukan, TidakTerautentikasi
from app.domain.konteks import Konteks
from app.domain.paginasi import keyset
from app.layanan.lencana_warga import LencanaLayanan

_MAP_LAMPIRAN = {
    "destinasi": EntitasLampiran.destinasi,
    "layanan": EntitasLampiran.layanan,
    "umkm": EntitasLampiran.umkm,
    "paket_wisata": EntitasLampiran.paket_wisata,
    "desa": EntitasLampiran.desa,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _pengelola(konteks: Konteks, desa_id: UUID) -> bool:
    from app.domain.enums import KodePeran

    return konteks.admin_global() or bool(
        konteks.peran_di(desa_id) & {KodePeran.kontributor, KodePeran.perangkat_desa, KodePeran.admin}
    )


def _wajib_pengelola(konteks: Konteks, desa_id: UUID) -> None:
    if not _pengelola(konteks, desa_id):
        raise TidakBerwenang("Hanya pengelola desa.")


def _wajib_login_berperan(konteks: Konteks, desa_id: UUID) -> None:
    if konteks.anonim:
        raise TidakTerautentikasi("perlu masuk terlebih dahulu")
    if konteks.admin_global():
        return
    if not konteks.peran_di(desa_id):
        raise TidakBerwenang("Perlu keanggotaan aktif di desa ini.")


def _enum_nilai(enum_cls, nilai: str, field: str) -> str:
    try:
        return enum_cls(nilai).value
    except ValueError:
        raise KesalahanValidasi(
            f"Nilai {field} tidak valid.",
            rincian=[{"field": field, "pesan": "enum_tidak_valid"}],
        )


class DapurKontenLayanan:
    def __init__(self, store):
        self.store = store
        self.poin = LencanaLayanan(store)

    async def _validasi_target(
        self, desa_id: UUID, target_tipe: str, target_id: UUID | None,
    ) -> None:
        if target_tipe == "desa":
            if target_id is not None and target_id != desa_id:
                d = await self.store.desa.ambil(target_id)
                if d is None or d.id != desa_id:
                    raise TidakDitemukan("Resource tak ditemukan.")
            return
        if target_id is None:
            raise KesalahanValidasi(
                "target_id wajib untuk target selain desa.",
                rincian=[{"field": "target_id", "pesan": "wajib"}],
            )
        if target_tipe == "destinasi":
            row = await self.store.destinasi.ambil(target_id)
            if row is None or row.desa_id != desa_id or getattr(row, "dihapus_pada", None) is not None:
                raise TidakDitemukan("Resource tak ditemukan.")
        elif target_tipe == "layanan":
            row = await self.store.layanan.ambil(target_id)
            if row is None or row.desa_id != desa_id or getattr(row, "dihapus_pada", None) is not None:
                raise TidakDitemukan("Resource tak ditemukan.")
        elif target_tipe == "umkm":
            row = await self.store.umkm.ambil(target_id)
            if row is None or row.desa_id != desa_id or row.dihapus_pada is not None:
                raise TidakDitemukan("Resource tak ditemukan.")
        elif target_tipe == "paket_wisata":
            row = await self.store.paket_wisata.ambil(target_id)
            if row is None or row.desa_id != desa_id or row.dihapus_pada is not None:
                raise TidakDitemukan("Resource tak ditemukan.")

    async def kirim(self, konteks: Konteks, desa_id: UUID, data: dict) -> E.Kontribusi:
        _wajib_login_berperan(konteks, desa_id)
        assert konteks.pengguna_id is not None
        tipe = _enum_nilai(TipeKontribusi, data["tipe"], "tipe")
        target_tipe = _enum_nilai(TargetKontribusi, data["target_tipe"], "target_tipe")
        if tipe == "foto" and not data.get("media_id"):
            raise KesalahanValidasi(
                "Kontribusi foto wajib menyertakan media_id.",
                rincian=[{"field": "media_id", "pesan": "wajib"}],
            )
        target_id = data.get("target_id")
        if tipe == "spot_baru":
            target_tipe = "desa"
            target_id = None
        await self._validasi_target(desa_id, target_tipe, target_id)
        kontribusi = E.Kontribusi(
            desa_id=desa_id,
            penyumbang_id=konteks.pengguna_id,
            tipe=tipe,
            target_tipe=target_tipe,
            target_id=target_id,
            muatan=data.get("muatan") or {},
            media_id=data.get("media_id"),
        )
        return await self.store.kontribusi.simpan(kontribusi)

    async def _ambil(self, desa_id: UUID, id_: UUID) -> E.Kontribusi:
        k = await self.store.kontribusi.ambil(id_)
        if k is None or k.desa_id != desa_id:
            raise TidakDitemukan("Kontribusi tak ditemukan.")
        return k

    async def detail(self, konteks: Konteks, desa_id: UUID, id_: UUID) -> dict:
        k = await self._ambil(desa_id, id_)
        if not _pengelola(konteks, desa_id) and k.penyumbang_id != konteks.pengguna_id:
            raise TidakBerwenang("Hanya penyumbang atau pengelola.")
        return self._dto(k)

    async def revisi(
        self,
        konteks: Konteks,
        desa_id: UUID,
        id_: UUID,
        muatan: dict,
        media_id: UUID | None = None,
    ) -> E.Kontribusi:
        k = await self._ambil(desa_id, id_)
        if k.penyumbang_id != konteks.pengguna_id:
            raise TidakBerwenang("Hanya penyumbang boleh merevisi.")
        if k.status not in ("menunggu", "revisi"):
            raise KesalahanValidasi("Hanya bisa direvisi saat status menunggu/revisi.")
        k.muatan = muatan
        if media_id is not None:
            k.media_id = media_id
        k.diperbarui_pada = _now()
        return await self.store.kontribusi.simpan(k)

    async def _terapkan_ke_target(self, k: E.Kontribusi) -> None:
        """Auto-apply konservatif (ADR §9.6): foto→lampiran; tips/ulasan tersimpan; koreksi/spot_baru tidak mutasi."""
        if k.tipe != "foto" or not k.media_id:
            return
        ent = _MAP_LAMPIRAN.get(k.target_tipe)
        if ent is None:
            return
        entitas_id = k.target_id if k.target_id is not None else k.desa_id
        media = await self.store.media.ambil(k.media_id)
        if media is None or not getattr(media, "dikonfirmasi", False):
            return
        lampiran = E.Lampiran(
            media_id=k.media_id,
            entitas_tipe=ent,
            entitas_id=entitas_id,
            urutan=999,
            utama=False,
        )
        await self.store.lampiran.tambah(lampiran)

    async def transisi(
        self, konteks: Konteks, desa_id: UUID, id_: UUID, aksi: str, catatan: str = "",
    ) -> E.Kontribusi:
        k = await self._ambil(desa_id, id_)
        if aksi in ("setuju", "tolak", "minta_revisi"):
            _wajib_pengelola(konteks, desa_id)
        elif aksi == "ajukan":
            if k.penyumbang_id != konteks.pengguna_id:
                raise TidakBerwenang("Hanya penyumbang boleh mengirim ulang.")
        dari = k.status
        ke = mesin_status.transisi("kontribusi", dari, aksi)
        k.status = ke
        k.diperbarui_pada = _now()
        await self.store.kontribusi.simpan(k)
        assert konteks.pengguna_id is not None
        await self.store.kurasi_log.simpan(E.KurasiLog(
            entitas_tipe="kontribusi",
            entitas_id=k.id,
            dari_status=dari,
            ke_status=ke,
            kurator_id=konteks.pengguna_id,
            keputusan=aksi,
            catatan=catatan,
        ))
        if ke == "disetujui":
            await self.poin.award(
                desa_id, k.penyumbang_id, "kontribusi_disetujui", "kontribusi", k.id,
            )
            await self._terapkan_ke_target(k)
        return k

    async def daftar(
        self,
        konteks: Konteks,
        desa_id: UUID,
        *,
        status: str | None = None,
        tipe: str | None = None,
        target_tipe: str | None = None,
        milik_saya: bool = False,
        kursor: str | None = None,
        batas: int = 20,
    ) -> dict:
        if milik_saya:
            if konteks.anonim:
                raise TidakTerautentikasi("perlu masuk terlebih dahulu")
            rows = [
                r for r in await self.store.kontribusi.daftar(desa_id)
                if r.penyumbang_id == konteks.pengguna_id
            ]
        else:
            _wajib_pengelola(konteks, desa_id)
            rows = await self.store.kontribusi.daftar(desa_id)
            if status:
                rows = [r for r in rows if r.status == status]
            else:
                rows = [r for r in rows if r.status == "menunggu"]
        if tipe:
            rows = [r for r in rows if r.tipe == tipe]
        if target_tipe:
            rows = [r for r in rows if r.target_tipe == target_tipe]
        rows = sorted(rows, key=lambda r: r.urut, reverse=True)
        hal = keyset(rows, batas=batas, kursor=kursor)
        return {
            "item": [self._dto(k) for k in hal.item],
            "meta": hal.meta(),
        }

    def _dto(self, k: E.Kontribusi) -> dict:
        return {
            "id": str(k.id),
            "tipe": k.tipe,
            "target_tipe": k.target_tipe,
            "target_id": str(k.target_id) if k.target_id else None,
            "muatan": k.muatan if isinstance(k.muatan, dict) else {},
            "media_id": str(k.media_id) if k.media_id else None,
            "status": k.status,
            "penyumbang_id": str(k.penyumbang_id),
            "dibuat_pada": k.dibuat_pada.isoformat() if k.dibuat_pada else None,
            "diperbarui_pada": k.diperbarui_pada.isoformat() if k.diperbarui_pada else None,
        }
