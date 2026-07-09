"""Gerbang kontrak §10 — mesin status terpusat."""
from __future__ import annotations

import pytest

from kiluan_f1.errors import TransisiIlegal
from kiluan_f1.mesin_status import transisi, tulis_log


def test_transisi_paket_valid():
    assert transisi("paket_wisata", "draft", "ajukan") == "review"


def test_transisi_paket_ilegal():
    with pytest.raises(TransisiIlegal):
        transisi("paket_wisata", "draft", "setuju")


def test_arsip_tanpa_log():
    assert tulis_log("paket_wisata", "arsip") is False
    assert tulis_log("paket_wisata", "setuju") is True
