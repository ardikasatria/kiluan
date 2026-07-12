"""Repo in-memory ASYNC untuk uji tanpa DB (test double setia repo SQL).

Sesuai ADR-0003 (async end-to-end), method dibuat `async` agar tanda tangan
identik dengan `repo/sql.py`. Implementasi tetap in-memory (tak ada I/O nyata).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from ..domain import entitas as E
from ..domain.enums import StatusDesa
from ..domain.errors import Konflik
from .warta_genta_memori import RepoBerita, RepoNotifikasi, RepoPeristiwa


def _now() -> datetime:
    return datetime.now(timezone.utc)


class RepoPengguna:
    def __init__(self):
        self._data: dict[UUID, E.Pengguna] = {}
        self._email: dict[str, UUID] = {}

    async def tambah(self, p: E.Pengguna) -> E.Pengguna:
        if p.email in self._email:
            raise Konflik("email sudah terdaftar", [{"field": "email", "pesan": "duplikat"}])
        self._data[p.id] = p
        self._email[p.email] = p.id
        return p

    async def ambil(self, id: UUID) -> Optional[E.Pengguna]:
        return self._data.get(id)

    async def ambil_email(self, email: str) -> Optional[E.Pengguna]:
        pid = self._email.get(email.strip().lower())
        return self._data.get(pid) if pid else None


class RepoDesa:
    def __init__(self):
        self._data: dict[UUID, E.Desa] = {}
        self._slug: dict[str, UUID] = {}

    async def tambah(self, d: E.Desa) -> E.Desa:
        if d.slug in self._slug:
            raise Konflik("slug desa sudah dipakai", [{"field": "slug", "pesan": "duplikat"}])
        self._data[d.id] = d
        self._slug[d.slug] = d.id
        return d

    async def ambil(self, id: UUID) -> Optional[E.Desa]:
        return self._data.get(id)

    async def ambil_slug(self, slug: str) -> Optional[E.Desa]:
        did = self._slug.get(slug)
        return self._data.get(did) if did else None

    async def daftar_aktif(self) -> list[E.Desa]:
        return [d for d in self._data.values() if d.status == StatusDesa.aktif]


class RepoKeanggotaan:
    def __init__(self):
        self._data: dict[UUID, E.Keanggotaan] = {}

    def _kunci(self, k: E.Keanggotaan) -> tuple:
        return (k.pengguna_id, k.desa_id, k.peran)

    async def tambah(self, k: E.Keanggotaan) -> E.Keanggotaan:
        for ada in self._data.values():
            if self._kunci(ada) == self._kunci(k):
                raise Konflik("keanggotaan (pengguna, desa, peran) sudah ada")
        self._data[k.id] = k
        return k

    async def ambil(self, id: UUID) -> Optional[E.Keanggotaan]:
        return self._data.get(id)

    async def daftar_pengguna(self, pengguna_id: UUID) -> list[E.Keanggotaan]:
        return [k for k in self._data.values() if k.pengguna_id == pengguna_id]

    async def daftar_desa(self, desa_id: UUID, peran=None, status=None) -> list[E.Keanggotaan]:
        out = [k for k in self._data.values() if k.desa_id == desa_id]
        if peran is not None:
            out = [k for k in out if k.peran == peran]
        if status is not None:
            out = [k for k in out if k.status == status]
        return out


class RepoToken:
    def __init__(self):
        self._data: dict[UUID, E.TokenAuth] = {}

    async def tambah(self, t: E.TokenAuth) -> E.TokenAuth:
        self._data[t.id] = t
        return t

    async def ambil_hash(self, token_hash: str, tipe) -> Optional[E.TokenAuth]:
        for t in self._data.values():
            if t.token_hash == token_hash and t.tipe == tipe:
                return t
        return None

    async def tandai_pakai(self, t: E.TokenAuth) -> None:
        t.dipakai_pada = _now()

    async def cabut_semua(self, pengguna_id: UUID, tipe) -> int:
        n = 0
        for t in self._data.values():
            if t.pengguna_id == pengguna_id and t.tipe == tipe and t.dipakai_pada is None:
                t.dipakai_pada = _now()
                n += 1
        return n


class RepoKategori:
    def __init__(self):
        self._data: dict[int, E.Kategori] = {}
        self._seq = 0

    async def tambah(self, k: E.Kategori) -> E.Kategori:
        self._seq += 1
        k.id = self._seq
        self._data[k.id] = k
        return k

    async def ambil(self, id: int) -> Optional[E.Kategori]:
        return self._data.get(id)


class RepoTag:
    def __init__(self):
        self._data: dict[int, E.Tag] = {}
        self._seq = 0

    async def tambah(self, t: E.Tag) -> E.Tag:
        self._seq += 1
        t.id = self._seq
        self._data[t.id] = t
        return t

    async def daftar(self, desa_id: UUID) -> list[E.Tag]:
        return [t for t in self._data.values() if t.desa_id in (None, desa_id)]

    async def ambil(self, id: int) -> Optional[E.Tag]:
        return self._data.get(id)


class RepoDestinasi:
    def __init__(self):
        self._data: dict[UUID, E.Destinasi] = {}

    async def tambah(self, d: E.Destinasi) -> E.Destinasi:
        for ada in self._data.values():
            if ada.desa_id == d.desa_id and ada.slug == d.slug and ada.dihapus_pada is None:
                raise Konflik(
                    "slug destinasi sudah dipakai di desa ini",
                    [{"field": "slug", "pesan": "duplikat"}],
                )
        self._data[d.id] = d
        return d

    async def ambil(self, id: UUID) -> Optional[E.Destinasi]:
        return self._data.get(id)

    async def ambil_slug(self, desa_id: UUID, slug: str) -> Optional[E.Destinasi]:
        for d in self._data.values():
            if d.desa_id == desa_id and d.slug == slug and d.dihapus_pada is None:
                return d
        return None

    async def daftar(self, desa_id: UUID) -> list[E.Destinasi]:
        return [d for d in self._data.values() if d.desa_id == desa_id]

    async def semua_desa_aktif(self, desa_aktif: set[UUID]) -> list[E.Destinasi]:
        return [d for d in self._data.values() if d.desa_id in desa_aktif]


class RepoLayanan:
    def __init__(self):
        self._data: dict[UUID, E.Layanan] = {}

    async def tambah(self, l: E.Layanan) -> E.Layanan:
        self._data[l.id] = l
        return l

    async def ambil(self, id: UUID) -> Optional[E.Layanan]:
        return self._data.get(id)

    async def daftar(self, desa_id: UUID) -> list[E.Layanan]:
        return [l for l in self._data.values() if l.desa_id == desa_id]


class RepoKalender:
    def __init__(self):
        self._data: dict[UUID, object] = {}

    async def tambah(self, row) -> object:
        self._data[row.id] = row
        return row

    async def ambil(self, id: UUID):
        return self._data.get(id)

    async def daftar(self, desa_id: UUID) -> list:
        return [r for r in self._data.values() if r.desa_id == desa_id]

    async def hapus(self, id: UUID) -> None:
        self._data.pop(id, None)


class RepoMedia:
    def __init__(self):
        self._data: dict[UUID, E.Media] = {}

    async def tambah(self, m: E.Media) -> E.Media:
        self._data[m.id] = m
        return m

    async def ambil(self, id: UUID) -> Optional[E.Media]:
        return self._data.get(id)

    async def hapus(self, id: UUID) -> None:
        self._data.pop(id, None)


class RepoLampiran:
    def __init__(self):
        self._data: dict[UUID, E.Lampiran] = {}

    async def tambah(self, l: E.Lampiran) -> E.Lampiran:
        self._data[l.id] = l
        return l

    async def ambil(self, id: UUID) -> Optional[E.Lampiran]:
        return self._data.get(id)

    async def daftar_entitas(self, entitas_tipe, entitas_id: UUID) -> list[E.Lampiran]:
        return [
            l for l in self._data.values()
            if l.entitas_tipe == entitas_tipe and l.entitas_id == entitas_id
        ]

    async def hapus(self, id: UUID) -> None:
        self._data.pop(id, None)


class RepoBidangUsaha:
    def __init__(self):
        self._data: dict[int, E.BidangUsaha] = {}
        self._seq = 0

    async def tambah(self, b: E.BidangUsaha) -> E.BidangUsaha:
        self._seq += 1
        b.id = self._seq
        self._data[b.id] = b
        return b

    async def ambil(self, id: int) -> Optional[E.BidangUsaha]:
        return self._data.get(id)

    async def daftar(self) -> list[E.BidangUsaha]:
        return list(self._data.values())


class RepoAturanPoin:
    def __init__(self):
        self._data: dict[int, E.AturanPoin] = {}
        self._seq = 0

    async def tambah(self, a: E.AturanPoin) -> E.AturanPoin:
        self._seq += 1
        a.id = self._seq
        self._data[a.id] = a
        return a

    async def cari(self, **kwargs) -> list[E.AturanPoin]:
        rows = list(self._data.values())
        for k, v in kwargs.items():
            if v is not None:
                rows = [r for r in rows if getattr(r, k, None) == v]
        return rows

    async def ambil_aturan(self, desa_id: UUID, kode_aksi: str) -> Optional[E.AturanPoin]:
        lokal = await self.cari(kode_aksi=kode_aksi, desa_id=desa_id, aktif=True)
        if lokal:
            return lokal[0]
        glob = await self.cari(kode_aksi=kode_aksi, desa_id=None, aktif=True)
        return glob[0] if glob else None


class RepoTransaksiPoin:
    def __init__(self):
        self._data: dict[UUID, E.TransaksiPoin] = {}

    async def cari(self, **kwargs) -> list[E.TransaksiPoin]:
        rows = list(self._data.values())
        for k, v in kwargs.items():
            if v is not None:
                rows = [r for r in rows if getattr(r, k, None) == v]
        return rows

    async def daftar_desa(self, desa_id: UUID, pengguna_id: UUID | None = None) -> list[E.TransaksiPoin]:
        rows = [t for t in self._data.values() if t.desa_id == desa_id]
        if pengguna_id is not None:
            rows = [t for t in rows if t.pengguna_id == pengguna_id]
        return rows

    async def award(
        self,
        desa_id: UUID,
        pengguna_id: UUID,
        aturan_id: int | None,
        kode_aksi: str,
        poin: int,
        referensi_tipe: str | None = None,
        referensi_id: UUID | None = None,
    ) -> bool:
        dup = await self.cari(
            pengguna_id=pengguna_id, kode_aksi=kode_aksi,
            referensi_tipe=referensi_tipe, referensi_id=referensi_id,
        )
        if dup:
            return False
        t = E.TransaksiPoin(
            desa_id=desa_id, pengguna_id=pengguna_id, aturan_id=aturan_id,
            kode_aksi=kode_aksi, poin=poin,
            referensi_tipe=referensi_tipe, referensi_id=referensi_id,
        )
        self._data[t.id] = t
        return True


class RepoBadge:
    def __init__(self):
        self._data: dict[int, E.Badge] = {}
        self._seq = 0

    async def tambah(self, b: E.Badge) -> E.Badge:
        self._seq += 1
        b.id = self._seq
        self._data[b.id] = b
        return b

    async def semua(self) -> list[E.Badge]:
        return list(self._data.values())

    async def daftar_aktif(self, desa_id: UUID) -> list[E.Badge]:
        return [
            b for b in self._data.values()
            if b.aktif and b.desa_id in (None, desa_id)
        ]


class RepoBadgePengguna:
    def __init__(self):
        self._data: dict[UUID, E.BadgePengguna] = {}

    async def cari(self, **kwargs) -> list[E.BadgePengguna]:
        rows = list(self._data.values())
        for k, v in kwargs.items():
            if v is not None:
                rows = [r for r in rows if getattr(r, k, None) == v]
        return rows

    async def tambah_idempoten(self, pengguna_id: UUID, badge_id: int) -> bool:
        if await self.cari(pengguna_id=pengguna_id, badge_id=badge_id):
            return False
        bp = E.BadgePengguna(pengguna_id=pengguna_id, badge_id=badge_id)
        self._data[bp.id] = bp
        return True

    async def daftar_milik(self, pengguna_id: UUID) -> list[E.BadgePengguna]:
        return await self.cari(pengguna_id=pengguna_id)


class _RepoGenerik:
    """Repo in-memory generik dengan simpan/ambil/cari."""

    def __init__(self):
        self._data: dict = {}

    async def simpan(self, entity):
        self._data[entity.id] = entity
        return entity

    async def ambil(self, id_):
        return self._data.get(id_)

    async def cari(self, **kwargs) -> list:
        rows = list(self._data.values())
        for k, v in kwargs.items():
            if v is not None:
                rows = [r for r in rows if getattr(r, k, None) == v]
        return rows

    async def hitung(self) -> int:
        return len(self._data)


class RepoUmkm(_RepoGenerik):
    async def daftar(self, desa_id: UUID) -> list[E.Umkm]:
        return await self.cari(desa_id=desa_id)


class RepoProdukJasa(_RepoGenerik):
    async def daftar(self, desa_id: UUID) -> list[E.ProdukJasa]:
        return await self.cari(desa_id=desa_id)


class RepoPaketWisata(_RepoGenerik):
    async def daftar(self, desa_id: UUID) -> list[E.PaketWisata]:
        return await self.cari(desa_id=desa_id)

    async def ambil_slug(self, desa_id: UUID, slug: str) -> E.PaketWisata | None:
        for p in await self.cari(desa_id=desa_id, slug=slug):
            if p.dihapus_pada is None:
                return p
        return None


class RepoPaketItem(_RepoGenerik):
    async def daftar_paket(self, paket_id: UUID) -> list[E.PaketItem]:
        return sorted(await self.cari(paket_id=paket_id), key=lambda i: (i.hari, i.urutan))

    async def hapus(self, id_: UUID) -> None:
        self._data.pop(id_, None)


class RepoKurasiLog(_RepoGenerik):
    pass


class RepoKontribusi(_RepoGenerik):
    async def daftar(self, desa_id: UUID) -> list[E.Kontribusi]:
        return await self.cari(desa_id=desa_id)


class RepoKartuAksi:
    def __init__(self):
        self._data: dict[int, E.KartuAksi] = {}
        self._seq = 0

    async def tambah(self, k: E.KartuAksi) -> E.KartuAksi:
        self._seq += 1
        k.id = self._seq
        self._data[k.id] = k
        return k

    async def ambil(self, id_: int) -> Optional[E.KartuAksi]:
        return self._data.get(id_)

    async def semua(self) -> list[E.KartuAksi]:
        return list(self._data.values())

    async def daftar_aktif(self, desa_id: UUID) -> list[E.KartuAksi]:
        return [
            k for k in self._data.values()
            if k.aktif and (k.desa_id is None or k.desa_id == desa_id)
        ]


class RepoPengajuanKartu(_RepoGenerik):
    async def daftar(self, desa_id: UUID) -> list[E.PengajuanKartu]:
        return await self.cari(desa_id=desa_id)


class RepoSertifikasiOwner(_RepoGenerik):
    async def cari(
        self,
        *,
        desa_id: UUID | None = None,
        subjek_tipe: str | None = None,
        subjek_id: UUID | None = None,
    ) -> list[E.SertifikasiOwner]:
        rows = list(self._data.values())
        if desa_id is not None:
            rows = [r for r in rows if r.desa_id == desa_id]
        if subjek_tipe is not None:
            rows = [r for r in rows if r.subjek_tipe == subjek_tipe]
        if subjek_id is not None:
            rows = [r for r in rows if r.subjek_id == subjek_id]
        return rows

    async def upsert(self, s: E.SertifikasiOwner) -> E.SertifikasiOwner:
        ada = await self.cari(desa_id=s.desa_id, subjek_tipe=s.subjek_tipe, subjek_id=s.subjek_id)
        if ada:
            row = ada[0]
            row.skor = s.skor
            row.tingkat = s.tingkat
            row.diperbarui_pada = s.diperbarui_pada
            return row
        return await self.simpan(s)


class ObjectStorePalsu:
    def __init__(self):
        self._objek: set[str] = set()

    async def taruh(self, objek: str) -> None:  # simulasi PUT klien
        self._objek.add(objek)

    async def ada(self, objek: str) -> bool:
        return objek in self._objek

    async def hapus(self, objek: str) -> None:
        self._objek.discard(objek)

    async def presign_put(self, objek: str) -> str:
        return f"https://minio.local/put/{objek}?X-Amz=sig"


class Penyimpanan:
    """Agregat repo in-memory (async)."""

    def __init__(self):
        self.pengguna = RepoPengguna()
        self.desa = RepoDesa()
        self.keanggotaan = RepoKeanggotaan()
        self.token = RepoToken()
        self.kategori = RepoKategori()
        self.tag = RepoTag()
        self.destinasi = RepoDestinasi()
        self.layanan = RepoLayanan()
        self.kalender = RepoKalender()
        self.media = RepoMedia()
        self.lampiran = RepoLampiran()
        self.bidang_usaha = RepoBidangUsaha()
        self.aturan_poin = RepoAturanPoin()
        self.transaksi_poin = RepoTransaksiPoin()
        self.badge = RepoBadge()
        self.badge_pengguna = RepoBadgePengguna()
        self.umkm = RepoUmkm()
        self.produk_jasa = RepoProdukJasa()
        self.paket_wisata = RepoPaketWisata()
        self.paket_item = RepoPaketItem()
        self.kurasi_log = RepoKurasiLog()
        self.kontribusi = RepoKontribusi()
        self.kartu_aksi = RepoKartuAksi()
        self.pengajuan_kartu = RepoPengajuanKartu()
        self.sertifikasi_owner = RepoSertifikasiOwner()
        self.berita = RepoBerita()
        self.peristiwa = RepoPeristiwa()
        self.notifikasi = RepoNotifikasi()
        self.objek = ObjectStorePalsu()
