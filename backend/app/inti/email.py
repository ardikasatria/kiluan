"""Adapter pengiriman email di belakang satu antarmuka `kirim`.

Provider dipilih lewat `EMAIL_PROVIDER`:
- `dev`         : log tautan ke konsol (default; cukup untuk B1–B4 & demo).
- `resend_api`  : Resend HTTP API via httpx (REKOMENDASI untuk stack async).
- `resend_smtp` : Resend SMTP via aiosmtplib (bila memang butuh transport SMTP).

Prasyarat go-live (bukan blocker kode): domain pengirim `sigerciv.com`
diverifikasi di Resend (DNS SPF/DKIM) + `RESEND_API_KEY` di env produksi.
"""
from __future__ import annotations

import logging
from typing import Protocol

from app.inti.konfig import konfig

log = logging.getLogger("kiluan.email")


class Pengirim(Protocol):
    async def kirim(self, ke: str, subjek: str, html: str) -> None: ...


class EmailDev:
    async def kirim(self, ke: str, subjek: str, html: str) -> None:
        log.info("[EMAIL-DEV] ke=%s | %s\n%s", ke, subjek, html)


class ResendAPI:
    """Kirim via Resend HTTP API (async, httpx)."""

    def __init__(self, api_key: str, dari: str):
        self.api_key = api_key
        self.dari = dari

    async def kirim(self, ke: str, subjek: str, html: str) -> None:
        import httpx  # impor malas: hanya bila provider ini aktif

        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"from": self.dari, "to": [ke], "subject": subjek, "html": html},
            )
            r.raise_for_status()


class ResendSMTP:
    """Kirim via Resend SMTP (async, aiosmtplib). user='resend', password=API key."""

    def __init__(self, host: str, port: int, user: str, password: str, dari: str):
        self.host, self.port, self.user, self.password, self.dari = host, port, user, password, dari

    async def kirim(self, ke: str, subjek: str, html: str) -> None:
        import aiosmtplib  # impor malas
        from email.message import EmailMessage

        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = self.dari, ke, subjek
        msg.set_content("Aktifkan HTML untuk melihat pesan ini.")
        msg.add_alternative(html, subtype="html")
        await aiosmtplib.send(
            msg, hostname=self.host, port=self.port,
            username=self.user, password=self.password,
            use_tls=self.port == 465, start_tls=self.port == 587,
        )


def buat_pengirim() -> Pengirim:
    cfg = konfig()
    p = cfg.EMAIL_PROVIDER
    if p == "resend_api":
        return ResendAPI(cfg.RESEND_API_KEY, cfg.EMAIL_FROM)
    if p == "resend_smtp":
        pw = cfg.SMTP_PASSWORD or cfg.RESEND_API_KEY
        return ResendSMTP(cfg.SMTP_HOST, cfg.SMTP_PORT, cfg.SMTP_USER, pw, cfg.EMAIL_FROM)
    return EmailDev()


# Instans default per proses; diganti via DI di app.main bila perlu.
pengirim: Pengirim = buat_pengirim()


def _tautan(path: str, token: str) -> str:
    return f"{konfig().APP_BASE_URL}{path}?token={token}"


async def kirim_verifikasi(email: str, kode: str) -> None:
    html = (
        f"<p>Halo,</p>"
        f"<p>Kode verifikasi email sigerciv Anda:</p>"
        f'<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{kode}</p>'
        f"<p>Kode berlaku 15 menit. Masukkan kode ini di halaman daftar atau masuk.</p>"
        f"<p>Abaikan email ini bila Anda tidak mendaftar di sigerciv.</p>"
    )
    await pengirim.kirim(email, "Kode verifikasi email sigerciv", html)


async def kirim_reset(email: str, token: str) -> None:
    tautan = _tautan("/reset-sandi", token)
    html = (
        f"<p>Halo,</p><p>Permintaan reset kata sandi sigerciv:</p>"
        f'<p><a href="{tautan}">Reset kata sandi</a></p>'
        f"<p>Abaikan email ini bila Anda tidak memintanya.</p>"
    )
    await pengirim.kirim(email, "Reset kata sandi sigerciv", html)
