"""Scaffold Python murni Fase 2 Kiluan (async, repo in-memory, tanpa DB).

Membuktikan invarian kontrak F2: checkout+hold kuota, anti-overbook, escrow split,
rilis+payout, refund, tukar poin, kupon, verifikasi Penjelajah, Pemandu rule-based,
isolasi tenant. Sengaja tanpa FastAPI/SQLAlchemy — hanya logika domain + gerbang pytest.
"""
