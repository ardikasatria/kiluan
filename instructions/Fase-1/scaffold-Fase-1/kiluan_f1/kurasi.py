"""Pencatatan kurasi_log append-only (KONTRAK §4.2)."""
from __future__ import annotations

from uuid import UUID

from .models import KurasiLog
from .repositori import RepoMemori


async def catat(
    repo_log: RepoMemori,
    *,
    entitas_tipe: str,
    entitas_id: UUID,
    dari_status: str,
    ke_status: str,
    kurator_id: UUID,
    keputusan: str,
    catatan: str = "",
) -> KurasiLog:
    return await repo_log.simpan(KurasiLog(
        entitas_tipe=entitas_tipe,
        entitas_id=entitas_id,
        dari_status=dari_status,
        ke_status=ke_status,
        kurator_id=kurator_id,
        keputusan=keputusan,
        catatan=catatan,
    ))
