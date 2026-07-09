"""Antarmuka MesinPemandu — rule (default) + slot model lokal terlatih."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

import httpx

from .konfig import MESIN_AKTIF, MODEL_LOKAL

log = logging.getLogger(__name__)


@dataclass
class KonteksPemandu:
    desa_id: str
    masukan: dict[str, Any]
    slot_tersedia: list[Any] = field(default_factory=list)
    destinasi: list[Any] = field(default_factory=list)
    paket_map: dict[str, Any] = field(default_factory=dict)


class MesinPemandu(ABC):
    """Implementasi itinerary / estimasi / chat."""

    @property
    @abstractmethod
    def kode_db(self) -> str:
        """Nilai untuk kolom sesi_pemandu.model_dipakai ('rule' | 'llm')."""

    @abstractmethod
    async def susun_itinerary(self, ctx: KonteksPemandu) -> dict[str, Any]:
        ...

    @abstractmethod
    async def estimasi_item(self, item: list[dict], harga_fn) -> Decimal:
        ...

    @abstractmethod
    async def jawab_chat(self, pesan: str, ctx: KonteksPemandu) -> tuple[str, list[dict]]:
        ...


class MesinAturan(MesinPemandu):
    """Rule-based — data lokal, hormati kuota slot."""

    @property
    def kode_db(self) -> str:
        return "rule"

    async def susun_itinerary(self, ctx: KonteksPemandu) -> dict[str, Any]:
        budget = Decimal(str(ctx.masukan.get("budget") or 10**12))
        minat = {m.lower() for m in ctx.masukan.get("minat") or []}
        rencana: list[dict] = []
        biaya = Decimal(0)

        for s in ctx.slot_tersedia:
            harga = s.harga_override or Decimal(0)
            if biaya + harga > budget:
                continue
            nama = None
            paket = ctx.paket_map.get(str(s.subjek_id))
            if paket:
                nama = getattr(paket, "nama", None)
                if minat and not any(m in (nama or "").lower() for m in minat):
                    if minat.isdisjoint({t.lower() for t in (getattr(paket, "tag", None) or [])}):
                        continue
            tanggal = s.tanggal.isoformat() if hasattr(s.tanggal, "isoformat") else str(s.tanggal)
            rencana.append({
                "slot_id": str(s.id),
                "tanggal": tanggal,
                "harga": float(harga),
                "subjek_tipe": s.subjek_tipe,
                "subjek_id": str(s.subjek_id),
                "nama": nama,
            })
            biaya += harga

        return {"itinerary": rencana, "perkiraan_biaya": float(biaya)}

    async def estimasi_item(self, item: list[dict], harga_fn) -> Decimal:
        total = Decimal(0)
        for it in item:
            h = await harga_fn(it["item_tipe"], it["item_id"])
            total += h * int(it.get("jumlah", 1))
        return total

    async def jawab_chat(self, pesan: str, ctx: KonteksPemandu) -> tuple[str, list[dict]]:
        kata = [w.lower() for w in pesan.split() if len(w) > 2]
        sumber: list[dict] = []
        for d in ctx.destinasi:
            teks = f"{getattr(d, 'nama', '')} {getattr(d, 'deskripsi', '') or ''}".lower()
            if not kata or any(k in teks for k in kata):
                sumber.append({
                    "tipe": "destinasi",
                    "id": str(d.id),
                    "nama": d.nama,
                    "cuplikan": (d.deskripsi or "")[:200],
                })
            if len(sumber) >= 3:
                break

        if not sumber:
            return (
                "Maaf, belum ada konten destinasi yang cocok. Coba tanyakan nama spot atau "
                "gunakan perencana itinerary untuk rekomendasi paket.",
                [],
            )

        nama_list = ", ".join(s["nama"] for s in sumber)
        jawab = (
            f"Berdasarkan data lokal desa, ini yang relevan: {nama_list}. "
            f"Cuplikan: {sumber[0]['cuplikan'] or '—'}. "
            "(Saran otomatis rule-based — bukan nasihat resmi.)"
        )
        return jawab, sumber


class MesinLokal(MesinPemandu):
    """Model terlatih sendiri — inference HTTP internal (bukan OpenAI)."""

    def __init__(self, cfg: dict | None = None) -> None:
        self.cfg = cfg or MODEL_LOKAL

    @property
    def kode_db(self) -> str:
        return "llm"

    async def _infer(self, prompt: str) -> str | None:
        if not self.cfg.get("aktif"):
            return None
        url = self.cfg["url_inference"]
        payload = {
            "model": self.cfg["model_id"],
            "prompt": prompt,
            "max_tokens": self.cfg.get("max_token", 512),
        }
        try:
            async with httpx.AsyncClient(timeout=self.cfg.get("timeout_dtk", 30)) as client:
                res = await client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                return data.get("text") or data.get("response") or data.get("output")
        except Exception as exc:
            log.warning("Inference lokal gagal, fallback rule: %s", exc)
            return None

    async def susun_itinerary(self, ctx: KonteksPemandu) -> dict[str, Any]:
        prompt = (
            f"Rencanakan itinerary wisata: {ctx.masukan}. "
            f"Slot tersedia: {len(ctx.slot_tersedia)}."
        )
        teks = await self._infer(prompt)
        if teks:
            return {"itinerary": [], "perkiraan_biaya": 0, "catatan_model": teks}
        return await MesinAturan().susun_itinerary(ctx)

    async def estimasi_item(self, item: list[dict], harga_fn) -> Decimal:
        return await MesinAturan().estimasi_item(item, harga_fn)

    async def jawab_chat(self, pesan: str, ctx: KonteksPemandu) -> tuple[str, list[dict]]:
        teks = await self._infer(f"Pertanyaan wisatawan: {pesan}")
        if teks:
            _, sumber = await MesinAturan().jawab_chat(pesan, ctx)
            return teks, sumber
        return await MesinAturan().jawab_chat(pesan, ctx)


def ambil_mesin() -> MesinPemandu:
    """Factory — pilih mesin dari konfig hardcode."""
    if MESIN_AKTIF == "lokal" and MODEL_LOKAL.get("aktif"):
        return MesinLokal()
    return MesinAturan()
