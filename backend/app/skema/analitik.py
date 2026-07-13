"""Skema API F3 — Anjungan Data."""
from __future__ import annotations

from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field


class JalankanAnalitik(BaseModel):
    lapisan: str = "gold"
    desa_id: Optional[str] = None


class LaporanBuat(BaseModel):
    periode: str = Field(pattern=r"^\d{4}-\d{2}$")


class LaporanTransisi(BaseModel):
    aksi: str = "finalkan"
