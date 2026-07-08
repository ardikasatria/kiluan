"""Balai Warga — layanan auth & identitas (async).

`keamanan` di-inject: default = domain murni (pbkdf2+HMAC, untuk unit test bebas
dependensi); produksi menyuntik `app.inti.keamanan` (argon2+JWT). Tanda tangan
fungsi keamanan identik sehingga logika di sini tak berubah antar-implementasi.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from ..domain import keamanan as keamanan_murni
from ..domain.entitas import Keanggotaan, Pengguna, TokenAuth
from ..domain.enums import KodePeran, StatusKeanggotaan, StatusPengguna, TipeToken
from ..domain.errors import Konflik, KesalahanValidasi, TidakBerwenang, TidakTerautentikasi
from ..skema.destinasi import DaftarReq, MasukReq


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AuthLayanan:
    def __init__(self, store, keamanan=keamanan_murni):
        self.store = store
        self.K = keamanan

    async def daftar(self, req: DaftarReq) -> tuple[Pengguna, str]:
        if await self.store.pengguna.ambil_email(req.email):
            raise Konflik("email sudah terdaftar", [{"field": "email", "pesan": "duplikat"}])
        p = Pengguna(
            email=req.email,
            nama=req.nama,
            kata_sandi_hash=self.K.hash_sandi(req.kata_sandi),
            telepon=req.telepon,
            status=StatusPengguna.pending,
        )
        await self.store.pengguna.tambah(p)
        await self.store.keanggotaan.tambah(
            Keanggotaan(pengguna_id=p.id, peran=KodePeran.wisatawan, desa_id=None,
                        status=StatusKeanggotaan.aktif)
        )
        mentah = self.K.token_mentah()
        await self.store.token.tambah(
            TokenAuth(pengguna_id=p.id, tipe=TipeToken.verifikasi_email,
                      token_hash=self.K.hash_token(mentah),
                      kedaluwarsa_pada=_now() + timedelta(days=2))
        )
        return p, mentah

    async def verifikasi_email(self, token_mentah: str) -> Pengguna:
        t = await self.store.token.ambil_hash(self.K.hash_token(token_mentah), TipeToken.verifikasi_email)
        if t is None or t.dipakai_pada is not None or t.kedaluwarsa_pada < _now():
            raise KesalahanValidasi("token verifikasi invalid atau kedaluwarsa")
        p = await self.store.pengguna.ambil(t.pengguna_id)
        p.status = StatusPengguna.aktif
        p.email_terverifikasi_pada = _now()
        await self.store.token.tandai_pakai(t)
        return p

    async def masuk(self, req: MasukReq) -> dict:
        p = await self.store.pengguna.ambil_email(req.email)
        if p is None or not self.K.verifikasi_sandi(req.kata_sandi, p.kata_sandi_hash):
            raise TidakTerautentikasi("email atau kata sandi salah")
        if p.status == StatusPengguna.pending:
            raise TidakBerwenang("akun belum diverifikasi")
        if p.status in (StatusPengguna.nonaktif, StatusPengguna.tersuspensi):
            raise TidakBerwenang("akun tidak aktif")
        p.login_terakhir = _now()
        akses, refresh = await self._terbitkan_sesi(p.id)
        return {"access_token": akses, "refresh_token": refresh, "tipe": "Bearer",
                "kedaluwarsa_dalam": 900, "pengguna_id": p.id}

    async def _terbitkan_sesi(self, pengguna_id: UUID) -> tuple[str, str]:
        akses = self.K.buat_access(pengguna_id)
        refresh = self.K.token_mentah()
        await self.store.token.tambah(
            TokenAuth(pengguna_id=pengguna_id, tipe=TipeToken.penyegar,
                      token_hash=self.K.hash_token(refresh),
                      kedaluwarsa_pada=_now() + timedelta(days=30))
        )
        return akses, refresh

    async def segarkan(self, refresh_mentah: str) -> dict:
        t = await self.store.token.ambil_hash(self.K.hash_token(refresh_mentah), TipeToken.penyegar)
        if t is None or t.kedaluwarsa_pada < _now():
            raise TidakTerautentikasi("refresh token invalid atau kedaluwarsa")
        if t.dipakai_pada is not None:
            await self.store.token.cabut_semua(t.pengguna_id, TipeToken.penyegar)
            raise TidakTerautentikasi("refresh token sudah dipakai — semua sesi dicabut")
        await self.store.token.tandai_pakai(t)  # rotasi
        akses, refresh = await self._terbitkan_sesi(t.pengguna_id)
        return {"access_token": akses, "refresh_token": refresh, "tipe": "Bearer", "kedaluwarsa_dalam": 900}

    async def keluar(self, refresh_mentah: str) -> None:
        t = await self.store.token.ambil_hash(self.K.hash_token(refresh_mentah), TipeToken.penyegar)
        if t and t.dipakai_pada is None:
            await self.store.token.tandai_pakai(t)

    async def lupa_sandi(self, email: str) -> Optional[str]:
        p = await self.store.pengguna.ambil_email(email)
        if p is None:
            return None
        mentah = self.K.token_mentah()
        await self.store.token.tambah(
            TokenAuth(pengguna_id=p.id, tipe=TipeToken.reset_sandi,
                      token_hash=self.K.hash_token(mentah),
                      kedaluwarsa_pada=_now() + timedelta(hours=1))
        )
        return mentah

    async def reset_sandi(self, token_mentah: str, kata_sandi_baru: str) -> None:
        t = await self.store.token.ambil_hash(self.K.hash_token(token_mentah), TipeToken.reset_sandi)
        if t is None or t.dipakai_pada is not None or t.kedaluwarsa_pada < _now():
            raise KesalahanValidasi("token reset invalid atau kedaluwarsa")
        if len(kata_sandi_baru) < 8:
            raise KesalahanValidasi("kata sandi minimal 8 karakter")
        p = await self.store.pengguna.ambil(t.pengguna_id)
        p.kata_sandi_hash = self.K.hash_sandi(kata_sandi_baru)
        await self.store.token.tandai_pakai(t)
        await self.store.token.cabut_semua(p.id, TipeToken.penyegar)
