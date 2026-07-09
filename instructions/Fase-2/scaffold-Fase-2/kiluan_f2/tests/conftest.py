import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from kiluan_f2.fabrik import App, seed  # noqa: E402


@pytest.fixture
def app():
    return App()


@pytest.fixture
async def dunia(app):
    """App + satu desa Kiluan ter-seed."""
    ctx = await seed(app)
    ctx["app"] = app
    return ctx
