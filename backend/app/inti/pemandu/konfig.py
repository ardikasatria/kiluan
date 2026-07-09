"""Registry model Pemandu — hardcode di sini saat deploy (tanpa GUI manajemen).

MESIN_AKTIF:
  - "rule"  → mesin aturan deterministik (default thin-slice PkM)
  - "lokal" → model terlatih sendiri via inference server internal

Kolom DB `model_dipakai` hanya menerima 'rule'|'llm'. Mesin lokal disimpan sebagai 'llm'
(artinya non-rule / model terlatih — BUKAN OpenAI atau API pihak ketiga).
"""
from __future__ import annotations

# --- Ubah nilai ini saat men-deploy model baru ---
MESIN_AKTIF: str = "rule"

MODEL_LOKAL: dict = {
  # Nyalakan setelah inference server + checkpoint siap di mesin yang sama/VPC.
    "aktif": False,
    "url_inference": "http://127.0.0.1:8080/v1/generate",
    "model_id": "kiluan-pemandu-v1",
    "path_checkpoint": "/var/models/kiluan-pemandu-v1",
    "timeout_dtk": 30,
    "max_token": 512,
}
