"""Shared M2 fixtures from the master PRD reference numbers."""

from __future__ import annotations

import os
from decimal import Decimal
from pathlib import Path

import pytest

# Force offline market data before importing the FastAPI app.
os.environ.setdefault("OFFLINE_PRICER", "1")

from oddlot_pricer.api.main import PricerState, set_state
from oddlot_pricer.config import get_config
from oddlot_pricer.db.book import HedgeBook
from oddlot_pricer.pricing.crowd import GeminiBucket
from oddlot_pricer.pricing.market_data import StaticMarketData


@pytest.fixture
def toy_gemini_buckets() -> list[GeminiBucket]:
    """PRD toy Gemini event (r=0.1 reference table)."""
    return [
        GeminiBucket(label="7,399.99 or below", bid=None, ask=Decimal("0.10")),
        GeminiBucket(label="7,400 to 7,599.99", bid=Decimal("0.12"), ask=Decimal("0.16")),
        GeminiBucket(label="7,600 to 7,799.99", bid=Decimal("0.17"), ask=Decimal("0.21")),
        GeminiBucket(label="7,800 to 7,999.99", bid=Decimal("0.20"), ask=Decimal("0.24")),
        GeminiBucket(label="8,000 to 8,199.99", bid=Decimal("0.09"), ask=Decimal("0.13")),
        GeminiBucket(label="8,200.01 or above", bid=Decimal("0.03"), ask=Decimal("0.06")),
    ]


@pytest.fixture
def ref_spot() -> float:
    return 780.0


@pytest.fixture
def ref_t() -> float:
    return 48.0 / 365.0


@pytest.fixture
def ref_sigma() -> float:
    return 0.16


@pytest.fixture(autouse=True)
def _offline_pricer_state(tmp_path: Path, toy_gemini_buckets: list[GeminiBucket]) -> None:
    config = get_config()
    market = StaticMarketData(
        spot=Decimal("780"),
        r=config.pricing.spx_ratio_fallback,
        gemini_buckets=toy_gemini_buckets,
        sigma=config.demo.sigma,
    )
    book = HedgeBook(f"sqlite:///{tmp_path / 'oddlot-test.db'}")
    set_state(PricerState(config=config, market=market, book=book))
