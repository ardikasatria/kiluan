"""Router Balai Warga — /auth/* (Kontrak API F0 §3)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from app.api.deps import get_penyimpanan
from app.domain.errors import BelumDiverifikasi
from app.inti import email, keamanan
from app.inti.konfig import konfig
from app.inti.ratelimit import periksa_batas
from app.layanan.auth import AuthLayanan
from app.skema.destinasi import DaftarReq, MasukReq

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

log = logging.getLogger("kiluan.auth")

_COOKIE = "kiluan_refresh"


def _layanan(store) -> AuthLayanan:
    # Inject keamanan produksi (argon2 + JWT).
    return AuthLayanan(store, keamanan=keamanan)


def _set_refresh(resp: Response, token: str) -> None:
    cfg = konfig()
    resp.set_cookie(
        _COOKIE, token, httponly=True, secure=cfg.COOKIE_SECURE,
        samesite="lax", path="/api/v1/auth",
    )


class TokenReq(BaseModel):
    token: str


class VerifikasiEmailReq(BaseModel):
    email: str
    kode: str


class ResetReq(BaseModel):
    token: str
    kata_sandi_baru: str


class EmailReq(BaseModel):
    email: str


async def _kirim_kode_verifikasi(email_alamat: str, kode: str) -> str:
    try:
        await email.kirim_verifikasi(email_alamat, kode)
        return "Kode verifikasi dikirim ke email."
    except Exception:
        log.error("gagal kirim email verifikasi ke %s", email_alamat, exc_info=True)
        return ("Akun dibuat, tetapi kode verifikasi gagal dikirim. "
                "Coba masuk nanti untuk menerima kode baru.")


@router.post("/daftar", status_code=201)
async def daftar(req: DaftarReq, store=Depends(get_penyimpanan)):
    p, kode = await _layanan(store).daftar(req)
    pesan = await _kirim_kode_verifikasi(p.email, kode)
    return {"pengguna": {"id": p.id, "email": p.email, "nama": p.nama, "status": p.status},
            "pesan": pesan}


@router.post("/verifikasi-email")
async def verifikasi_email(req: VerifikasiEmailReq, store=Depends(get_penyimpanan)):
    p = await _layanan(store).verifikasi_email(req.email, req.kode)
    return {"status": p.status}


@router.post("/kirim-ulang-verifikasi")
async def kirim_ulang_verifikasi(req: EmailReq, request: Request, store=Depends(get_penyimpanan)):
    ip = request.client.host if request.client else "anon"
    await periksa_batas(f"rl:kirim-ulang-verifikasi:{ip}", batas=3, jendela_detik=300)
    kode = await _layanan(store).kirim_ulang_verifikasi(req.email)
    if kode:
        await _kirim_kode_verifikasi(req.email.strip().lower(), kode)
    return {"pesan": "Jika akun belum diverifikasi, kode baru telah dikirim ke email."}


@router.post("/masuk")
async def masuk(req: MasukReq, request: Request, response: Response, store=Depends(get_penyimpanan)):
    ip = request.client.host if request.client else "anon"
    await periksa_batas(f"rl:masuk:{ip}", batas=5, jendela_detik=60)
    try:
        sesi = await _layanan(store).masuk(req)
    except BelumDiverifikasi as exc:
        if exc.kode_verifikasi:
            await _kirim_kode_verifikasi(req.email, exc.kode_verifikasi)
        raise
    _set_refresh(response, sesi["refresh_token"])
    return {"access_token": sesi["access_token"], "tipe": "Bearer",
            "kedaluwarsa_dalam": sesi["kedaluwarsa_dalam"], "pengguna_id": sesi["pengguna_id"]}


@router.post("/segarkan")
async def segarkan(request: Request, response: Response, store=Depends(get_penyimpanan)):
    from app.domain.errors import TidakTerautentikasi

    refresh = request.cookies.get(_COOKIE)
    if not refresh:
        raise TidakTerautentikasi("refresh token tidak ada")
    sesi = await _layanan(store).segarkan(refresh)
    _set_refresh(response, sesi["refresh_token"])
    return {"access_token": sesi["access_token"], "tipe": "Bearer",
            "kedaluwarsa_dalam": sesi["kedaluwarsa_dalam"]}


@router.post("/keluar", status_code=204)
async def keluar(request: Request, response: Response, store=Depends(get_penyimpanan)):
    refresh = request.cookies.get(_COOKIE)
    if refresh:
        await _layanan(store).keluar(refresh)
    response.delete_cookie(_COOKIE, path="/api/v1/auth")


@router.post("/lupa-sandi")
async def lupa_sandi(req: EmailReq, store=Depends(get_penyimpanan)):
    token = await _layanan(store).lupa_sandi(req.email)
    if token:
        try:
            await email.kirim_reset(req.email, token)
        except Exception:
            log.error("gagal kirim email reset ke %s", req.email, exc_info=True)
    return {"pesan": "Jika email terdaftar, tautan reset telah dikirim."}


@router.post("/reset-sandi")
async def reset_sandi(req: ResetReq, store=Depends(get_penyimpanan)):
    await _layanan(store).reset_sandi(req.token, req.kata_sandi_baru)
    return {"pesan": "Kata sandi diperbarui."}
