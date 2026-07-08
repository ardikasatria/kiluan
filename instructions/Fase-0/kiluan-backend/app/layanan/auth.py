"""Balai Warga — layanan auth & identitas.

Menegakkan siklus: daftar → verifikasi email → masuk → segarkan (rotasi) →
keluar; token sekali-pakai; deteksi reuse refresh mencabut seluruh sesi.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from ..domain import keamanan as K
from ..domain.entitas import Keanggotaan, Pengguna, TokenAuth
from ..domain.enums import KodePeran, StatusKeanggotaan, StatusPengguna, TipeToken
from ..domain.errors import Konflik, KesalahanValidasi, TidakBerwenang, TidakTerautentikasi
from ..skema.destinasi import DaftarReq, MasukReq


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AuthLayanan:
    def __init__(self, store):
        self.store = store

    # --- registrasi & verifikasi ---
    def daftar(self, req: DaftarReq) -> tuple[Pengguna, str]:
        if self.store.pengguna.ambil_email(req.email):
            raise Konflik("email sudah terdaftar", [{"field": "email", "pesan": "duplikat"}])
        p = Pengguna(
            email=req.email,
            nama=req.nama,
            kata_sandi_hash=K.hash_sandi(req.kata_sandi),
            telepon=req.telepon,
            status=StatusPengguna.pending,
        )
        self.store.pengguna.tambah(p)
        # keanggotaan global wisatawan (auto-aktif) — lihat Kontrak API §3.1
        self.store.keanggotaan.tambah(
            Keanggotaan(
                pengguna_id=p.id,
                peran=KodePeran.wisatawan,
                desa_id=None,
                status=StatusKeanggotaan.aktif,
            )
        )
        mentah = K.token_mentah()
        self.store.token.tambah(
            TokenAuth(
                pengguna_id=p.id,
                tipe=TipeToken.verifikasi_email,
                token_hash=K.hash_token(mentah),
                kedaluwarsa_pada=_now() + timedelta(days=2),
            )
        )
        return p, mentah  # `mentah` di produksi dikirim via email, bukan dikembalikan

    def verifikasi_email(self, token_mentah: str) -> Pengguna:
        t = self.store.token.ambil_hash(K.hash_token(token_mentah), TipeToken.verifikasi_email)
        if t is None or t.dipakai_pada is not None or t.kedaluwarsa_pada < _now():
            raise KesalahanValidasi("token verifikasi invalid atau kedaluwarsa")
        p = self.store.pengguna.ambil(t.pengguna_id)
        p.status = StatusPengguna.aktif
        p.email_terverifikasi_pada = _now()
        self.store.token.tandai_pakai(t)
        return p

    # --- login & sesi ---
    def masuk(self, req: MasukReq) -> dict:
        p = self.store.pengguna.ambil_email(req.email)
        if p is None or not K.verifikasi_sandi(req.kata_sandi, p.kata_sandi_hash):
            raise TidakTerautentikasi("email atau kata sandi salah")
        if p.status == StatusPengguna.pending:
            raise TidakBerwenang("akun belum diverifikasi")
        if p.status in (StatusPengguna.nonaktif, StatusPengguna.tersuspensi):
            raise TidakBerwenang("akun tidak aktif")
        p.login_terakhir = _now()
        akses, refresh = self._terbitkan_sesi(p.id)
        return {
            "access_token": akses,
            "refresh_token": refresh,
            "tipe": "Bearer",
            "kedaluwarsa_dalam": 900,
            "pengguna_id": p.id,
        }

    def _terbitkan_sesi(self, pengguna_id: UUID) -> tuple[str, str]:
        akses = K.buat_access(pengguna_id)
        refresh = K.token_mentah()
        self.store.token.tambah(
            TokenAuth(
                pengguna_id=pengguna_id,
                tipe=TipeToken.penyegar,
                token_hash=K.hash_token(refresh),
                kedaluwarsa_pada=_now() + timedelta(days=30),
            )
        )
        return akses, refresh

    def segarkan(self, refresh_mentah: str) -> dict:
        t = self.store.token.ambil_hash(K.hash_token(refresh_mentah), TipeToken.penyegar)
        if t is None or t.kedaluwarsa_pada < _now():
            raise TidakTerautentikasi("refresh token invalid atau kedaluwarsa")
        if t.dipakai_pada is not None:
            # Reuse token terpakai → indikasi pencurian → cabut semua sesi.
            self.store.token.cabut_semua(t.pengguna_id, TipeToken.penyegar)
            raise TidakTerautentikasi("refresh token sudah dipakai — semua sesi dicabut")
        self.store.token.tandai_pakai(t)  # rotasi
        akses, refresh = self._terbitkan_sesi(t.pengguna_id)
        return {"access_token": akses, "refresh_token": refresh, "tipe": "Bearer", "kedaluwarsa_dalam": 900}

    def keluar(self, refresh_mentah: str) -> None:
        t = self.store.token.ambil_hash(K.hash_token(refresh_mentah), TipeToken.penyegar)
        if t and t.dipakai_pada is None:
            self.store.token.tandai_pakai(t)

    # --- reset sandi ---
    def lupa_sandi(self, email: str) -> Optional[str]:
        p = self.store.pengguna.ambil_email(email)
        if p is None:
            return None  # jangan bocorkan keberadaan email (tetap 200 di API)
        mentah = K.token_mentah()
        self.store.token.tambah(
            TokenAuth(
                pengguna_id=p.id,
                tipe=TipeToken.reset_sandi,
                token_hash=K.hash_token(mentah),
                kedaluwarsa_pada=_now() + timedelta(hours=1),
            )
        )
        return mentah

    def reset_sandi(self, token_mentah: str, kata_sandi_baru: str) -> None:
        t = self.store.token.ambil_hash(K.hash_token(token_mentah), TipeToken.reset_sandi)
        if t is None or t.dipakai_pada is not None or t.kedaluwarsa_pada < _now():
            raise KesalahanValidasi("token reset invalid atau kedaluwarsa")
        if len(kata_sandi_baru) < 8:
            raise KesalahanValidasi("kata sandi minimal 8 karakter")
        p = self.store.pengguna.ambil(t.pengguna_id)
        p.kata_sandi_hash = K.hash_sandi(kata_sandi_baru)
        self.store.token.tandai_pakai(t)
        self.store.token.cabut_semua(p.id, TipeToken.penyegar)
