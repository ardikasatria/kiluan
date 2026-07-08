"""Entry FastAPI Kiluan — F0 (B1: Balai Warga aktif)."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api import auth, keanggotaan, referensi, saya
from app.domain.errors import KesalahanDomain
from app.inti.db import cek_db

app = FastAPI(title="Kiluan API", version="0.1.0")


@app.exception_handler(KesalahanDomain)
async def handler_kesalahan_domain(_: Request, exc: KesalahanDomain):
    return JSONResponse(status_code=exc.http, content=exc.amplop())


@app.get("/api/v1/sehat")
async def sehat():
    try:
        ok_db = await cek_db()
    except Exception:
        ok_db = False
    return {"status": "ok" if ok_db else "degradasi", "db": ok_db}


app.include_router(auth.router)
app.include_router(saya.router)
app.include_router(keanggotaan.router)
app.include_router(referensi.router)

# B2–B4: destinasi, media, discovery routers menyusul.
