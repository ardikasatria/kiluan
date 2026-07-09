"""Primitif keamanan.

Catatan produksi: sandi memakai argon2/bcrypt, access token JWT ditandatangani
kunci dari secret manager, refresh token opaque. Di scaffold ini dipakai
stdlib (pbkdf2 + HMAC) agar bebas dependensi & mudah diuji — perilaku (rotasi,
kedaluwarsa, deteksi reuse) yang diuji identik.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

from .errors import TidakTerautentikasi

_ITERASI = 100_000
# Di produksi: dari environment / secret manager, bukan hard-coded.
_KUNCI_TANDA_TANGAN = b"kunci-dev-jangan-dipakai-di-produksi"


def hash_sandi(sandi: str) -> str:
    garam = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", sandi.encode(), garam, _ITERASI)
    return base64.b64encode(garam).decode() + "$" + base64.b64encode(dk).decode()


def verifikasi_sandi(sandi: str, tersimpan: str) -> bool:
    try:
        g, d = tersimpan.split("$")
        garam = base64.b64decode(g)
        dk = hashlib.pbkdf2_hmac("sha256", sandi.encode(), garam, _ITERASI)
        return hmac.compare_digest(base64.b64encode(dk).decode(), d)
    except Exception:
        return False


def token_mentah() -> str:
    """Refresh/one-time token opaque 256-bit; hanya hash-nya disimpan."""
    return secrets.token_urlsafe(32)


def kode_verifikasi_email() -> str:
    """Kode 6 digit untuk verifikasi email (disimpan sebagai hash di DB)."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_token(t: str) -> str:
    return hashlib.sha256(t.encode()).hexdigest()


def buat_access(pengguna_id, umur_detik: int = 900, sekarang: int | None = None) -> str:
    sekarang = sekarang if sekarang is not None else int(time.time())
    payload = {
        "sub": str(pengguna_id),
        "iat": sekarang,
        "exp": sekarang + umur_detik,
        "jti": secrets.token_hex(8),
    }
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    sig = hmac.new(_KUNCI_TANDA_TANGAN, body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def baca_access(token: str, sekarang: int | None = None) -> dict:
    sekarang = sekarang if sekarang is not None else int(time.time())
    try:
        body, sig = token.split(".")
        harap = hmac.new(_KUNCI_TANDA_TANGAN, body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, harap):
            raise TidakTerautentikasi("tanda tangan token salah")
        payload = json.loads(base64.urlsafe_b64decode(body.encode()))
    except TidakTerautentikasi:
        raise
    except Exception:
        raise TidakTerautentikasi("token invalid")
    if payload["exp"] < sekarang:
        raise TidakTerautentikasi("token kedaluwarsa")
    return payload
