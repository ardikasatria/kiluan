"""Router Balai Warga — /auth/* (Kontrak API F0 §3)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from app.api.deps import get_penyimpanan
from app.inti import email, keamanan
from app.inti.ratelimit import periksa_batas
from app.layanan.auth import AuthLayanan
from app.skema.destinasi import DaftarReq, MasukReq

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_COOKIE = "kiluan_refresh"


def _layanan(store) -> AuthLayanan:
    # Inject keamanan produksi (argon2 + JWT).
    return AuthLayanan(store, keamanan=keamanan)


def _set_refresh(resp: Response, token: str) -> None:
    resp.set_cookie(_COOKIE, token, httponly=True, secure=True, samesite="lax", path="/api/v1/auth")


class TokenReq(BaseModel):
    token: str


class ResetReq(BaseModel):
    token: str
    kata_sandi_baru: str


class EmailReq(BaseModel):
    email: str


@router.post("/daftar", status_code=201)
async def daftar(req: DaftarReq, store=Depends(get_penyimpanan)):
    p, token = await _layanan(store).daftar(req)
    await email.kirim_verifikasi(p.email, token)
    return {"pengguna": {"id": p.id, "email": p.email, "nama": p.nama, "status": p.status},
            "pesan": "Tautan verifikasi dikirim ke email."}


@router.post("/verifikasi-email")
async def verifikasi_email(req: TokenReq, store=Depends(get_penyimpanan)):
    p = await _layanan(store).verifikasi_email(req.token)
    return {"status": p.status}


@router.post("/masuk")
async def masuk(req: MasukReq, request: Request, response: Response, store=Depends(get_penyimpanan)):
    ip = request.client.host if request.client else "anon"
    await periksa_batas(f"rl:masuk:{ip}", batas=5, jendela_detik=60)
    sesi = await _layanan(store).masuk(req)
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
        await email.kirim_reset(req.email, token)
    return {"pesan": "Jika email terdaftar, tautan reset telah dikirim."}


@router.post("/reset-sandi")
async def reset_sandi(req: ResetReq, store=Depends(get_penyimpanan)):
    await _layanan(store).reset_sandi(req.token, req.kata_sandi_baru)
    return {"pesan": "Kata sandi diperbarui."}
