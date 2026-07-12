"""Background poll — fan-out peristiwa Genta ke inbox notifikasi."""
from __future__ import annotations

import asyncio
import logging

from app.inti.db import BuatSesi
from app.inti.pengirim_notifikasi import PengirimNotifikasi
from app.repo.sql import Penyimpanan

logger = logging.getLogger("kiluan.genta")
INTERVAL_DETIK = 30


async def poll_genta_loop() -> None:
    """Polling outbox peristiwa; interval hemat mirip sapu_kedaluwarsa."""
    while True:
        try:
            async with BuatSesi() as sesi:
                store = Penyimpanan(sesi)
                n = await PengirimNotifikasi(store).proses_antrian()
                await sesi.commit()
                if n:
                    logger.debug("genta: %d peristiwa diproses", n)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("genta poll gagal")
        await asyncio.sleep(INTERVAL_DETIK)
