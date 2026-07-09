"""Webhook global pembayaran gateway (KONTRAK F2 §4.5)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_penyimpanan
from app.layanan.dermaga import DermagaLayanan

router = APIRouter(prefix="/api/v1", tags=["webhook"])


def _svc(store=Depends(get_penyimpanan)) -> DermagaLayanan:
    return DermagaLayanan(store)


@router.post("/webhooks/pembayaran/{gateway}")
async def webhook_pembayaran(
    gateway: str,
    event: dict,
    svc: DermagaLayanan = Depends(_svc),
):
    """Callback gateway — di luar path tenant."""
    return await svc.proses_webhook(gateway, event)
