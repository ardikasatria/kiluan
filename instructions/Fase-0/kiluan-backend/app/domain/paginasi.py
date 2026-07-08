"""Keyset (cursor) pagination — stabil saat data ditambah di tengah iterasi.

Cursor mengkodekan `(urut, id)` baris terakhir. Urutan default: terbaru dulu
(desc). Halaman berikutnya = baris dengan kunci < kunci terakhir yang tampil.
"""
from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Callable, Iterable


@dataclass
class Halaman:
    item: list
    kursor_berikutnya: str | None
    ada_lagi: bool
    batas: int

    def meta(self) -> dict:
        return {
            "kursor_berikutnya": self.kursor_berikutnya,
            "ada_lagi": self.ada_lagi,
            "batas": self.batas,
        }


def _enc(kunci: tuple) -> str:
    return base64.urlsafe_b64encode(json.dumps([kunci[0], str(kunci[1])]).encode()).decode()


def _dec(kursor: str) -> tuple:
    data = json.loads(base64.urlsafe_b64decode(kursor.encode()))
    return (data[0], str(data[1]))


def keyset(
    baris: Iterable,
    batas: int = 20,
    kursor: str | None = None,
    kunci: Callable = lambda r: (r.urut, str(r.id)),
) -> Halaman:
    batas = max(1, min(int(batas), 100))
    urut_baris = sorted(baris, key=kunci, reverse=True)
    if kursor:
        ambang = _dec(kursor)
        urut_baris = [r for r in urut_baris if kunci(r) < ambang]
    potong = urut_baris[:batas]
    ada_lagi = len(urut_baris) > batas
    kb = _enc(kunci(potong[-1])) if potong and ada_lagi else None
    return Halaman(potong, kb, ada_lagi, batas)
