"""Registry F2 per-desa — App in-memory + seed pengaturan default."""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from app.f2.bridge import sinkron_katalog_f1
from app.f2.fabrik import App
from app.f2.models import PengaturanDesa
from app.repo.memori import Penyimpanan

_apps: dict[str, App] = {}


def app_f2(desa_id: UUID) -> App:
    key = str(desa_id)
    if key not in _apps:
        _apps[key] = App()
    return _apps[key]


async def pastikan_desa_f2(store: Penyimpanan, desa_id: UUID) -> App:
    """Seed pengaturan (placeholder FGD) + sinkron katalog F1 bila perlu."""
    app = app_f2(desa_id)
    did = str(desa_id)
    if await app.b.pengaturan.ambil(did) is None:
        await app.b.pengaturan.simpan(
            PengaturanDesa(
                did,
                persen_reinvestasi=Decimal("0.10"),
                persen_fee_platform=Decimal("0.02"),
                batas_hold_menit=30,
                gateway="manual",
                kebijakan_pembatalan={"catatan": "belum_disahkan_fgd"},
            )
        )
    await sinkron_katalog_f1(store, app.b, desa_id)
    return app


def reset_registry() -> None:
    """Untuk uji — bersihkan cache App."""
    _apps.clear()
