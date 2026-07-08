"""Entry FastAPI Fase 0 (B0).

B0 hanya menyediakan kerangka + health check. Router domain (auth, destinasi,
media, discovery) ditambahkan pada brief B1–B4.
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.domain.errors import KesalahanDomain
from app.inti.db import cek_db

app = FastAPI(title="Kiluan API", version="0.1.0", root_path="")


@app.exception_handler(KesalahanDomain)
async def handler_kesalahan_domain(_: Request, exc: KesalahanDomain):
    return JSONResponse(status_code=exc.http, content=exc.amplop())


@app.get("/api/v1/sehat")
async def sehat():
    ok_db = False
    try:
        ok_db = await cek_db()
    except Exception:
        ok_db = False
    status = "ok" if ok_db else "degradasi"
    return {"status": status, "db": ok_db}


# Router tenant & global disisipkan di B1–B4:
# from app.api import auth, saya, keanggotaan, destinasi, media, discovery
# app.include_router(auth.router, prefix="/api/v1")
# ...
