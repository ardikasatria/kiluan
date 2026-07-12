"""Entry FastAPI sigerciv — F0 (B1: Balai Warga aktif)."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, berita, desa, dermaga, destinasi, discovery, kalender, keanggotaan, kontribusi, layanan, lencana, media, naik_kelas, notifikasi, pasar, pemandu, penjelajah, poin_f2, referensi, saya, simpanan, uang, webhook
from app.domain.errors import KesalahanDomain
from app.inti.db import cek_db
from app.inti.genta_poll import poll_genta_loop
from app.inti.konfig import konfig


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(poll_genta_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="sigerciv API", version="0.2.0", lifespan=lifespan)

cfg = konfig()


# Didaftarkan SEBELUM CORSMiddleware agar berada di lapisan dalam: exception tak
# terduga diubah jadi JSON 500 di sini, lalu CORSMiddleware tetap menambahkan
# header Access-Control-Allow-Origin (tanpa ini browser melapor "CORS error",
# menutupi galat aslinya).
@app.middleware("http")
async def tangkap_galat_server(request: Request, call_next):
    import logging

    try:
        return await call_next(request)
    except Exception:
        logging.getLogger("kiluan.main").exception("galat tak tertangani: %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"galat": {"kode": "galat_server", "pesan": "terjadi kesalahan pada server", "rincian": []}},
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
app.include_router(simpanan.router)
app.include_router(keanggotaan.router)
app.include_router(referensi.router)
app.include_router(discovery.router)
app.include_router(desa.router)
app.include_router(destinasi.router)
app.include_router(layanan.router)
app.include_router(kalender.router)
app.include_router(media.router_media)
app.include_router(media.router_lampiran)
app.include_router(lencana.router)
app.include_router(pasar.router)
app.include_router(kontribusi.router)
app.include_router(berita.router)
app.include_router(notifikasi.router)
app.include_router(naik_kelas.router)
app.include_router(dermaga.router)
app.include_router(uang.router)
app.include_router(poin_f2.router)
app.include_router(penjelajah.router)
app.include_router(pemandu.router)
app.include_router(webhook.router)
