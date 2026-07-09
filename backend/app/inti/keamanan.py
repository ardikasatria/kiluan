"""Keamanan produksi — argon2 (sandi) + JWT HS256 (access token).

Tanda tangan fungsi identik dengan `app.domain.keamanan` sehingga di-inject ke
`AuthLayanan` tanpa mengubah service (ADR-0003). `token_mentah`/`hash_token`
di-reuse dari domain (identik).
"""
from __future__ import annotations

import time

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from jose import JWTError, jwt

from app.domain.errors import TidakTerautentikasi
from app.domain.keamanan import hash_token, kode_verifikasi_email, token_mentah  # reuse identik
from app.inti.konfig import konfig

__all__ = ["hash_sandi", "verifikasi_sandi", "token_mentah", "kode_verifikasi_email", "hash_token",
           "buat_access", "baca_access"]

_ph = PasswordHasher()


def hash_sandi(sandi: str) -> str:
    return _ph.hash(sandi)


def verifikasi_sandi(sandi: str, tersimpan: str) -> bool:
    try:
        _ph.verify(tersimpan, sandi)
        return True
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


def buat_access(pengguna_id, umur_detik: int | None = None, sekarang: int | None = None) -> str:
    now = sekarang if sekarang is not None else int(time.time())
    umur = umur_detik if umur_detik is not None else konfig().AKSES_UMUR_DETIK
    payload = {"sub": str(pengguna_id), "iat": now, "exp": now + umur}
    return jwt.encode(payload, konfig().JWT_SECRET, algorithm="HS256")


def baca_access(token: str, sekarang: int | None = None) -> dict:
    try:
        # jose memeriksa exp secara otomatis.
        return jwt.decode(token, konfig().JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        raise TidakTerautentikasi("token invalid atau kedaluwarsa")
