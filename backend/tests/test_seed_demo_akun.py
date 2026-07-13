"""Uji konstanta seed akun demo."""
from app.domain.seed_demo_akun import DEMO_AKUN, DEMO_SANDI_DEFAULT, sandi_demo


def test_demo_akun_satu_per_peran():
    kode = {a["peran_id"] for a in DEMO_AKUN}
    assert kode == {1, 3, 4, 5, 6, 7}
    assert len(DEMO_AKUN) == 6


def test_sandi_demo_default():
    assert sandi_demo() == DEMO_SANDI_DEFAULT
