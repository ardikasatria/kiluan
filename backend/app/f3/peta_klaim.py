"""Peta klaim dampak stempel → kode indikator ekologi (FGD Pokdarwis)."""

PETA_KLAIM_INDIKATOR: dict[str, str] = {
    "mangrove": "mangrove_survival",
    "karang": "kesehatan_karang",
    "sampah": "sampah_terkumpul",
    "lumba": "populasi_lumba",
    "lumba_lumba": "populasi_lumba",
}


def indikator_dari_klaim(kunci: str) -> str | None:
    return PETA_KLAIM_INDIKATOR.get(kunci)
