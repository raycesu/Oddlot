"""P1: seeded LP P&L simulation and GET /simulation schema."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator

from oddlot_pricer.api.main import app
from oddlot_pricer.pricing.crowd import GeminiBucket
from oddlot_pricer.pricing.simulation import clear_simulation_cache, run_simulation

SCHEMA = Path(__file__).resolve().parents[2] / "schemas" / "api" / "simulation.schema.json"

CLIENT = TestClient(app)

_BUCKETS = [
    GeminiBucket(label="7,399.99 or below", bid=None, ask=Decimal("0.10")),
    GeminiBucket(label="7,400 to 7,599.99", bid=Decimal("0.12"), ask=Decimal("0.16")),
    GeminiBucket(label="7,600 to 7,799.99", bid=Decimal("0.17"), ask=Decimal("0.21")),
    GeminiBucket(label="7,800 to 7,999.99", bid=Decimal("0.20"), ask=Decimal("0.24")),
    GeminiBucket(label="8,000 to 8,199.99", bid=Decimal("0.09"), ask=Decimal("0.13")),
    GeminiBucket(label="8,200.01 or above", bid=Decimal("0.03"), ask=Decimal("0.06")),
]


def _run() -> dict:
    return run_simulation(
        spot=780.0,
        expiry=datetime(2026, 12, 31, 21, 0, tzinfo=timezone.utc),
        now=datetime(2026, 11, 16, 21, 0, tzinfo=timezone.utc),
        strike_step=20,
        width=20.0,
        buckets=_BUCKETS,
        r=Decimal("0.1"),
        cost_bps=2,
    )


def _span(row: dict) -> Decimal:
    return Decimal(row["p95"]) - Decimal(row["p05"])


def test_simulation_is_seeded_and_hedges_tighten_the_book() -> None:
    first = _run()
    second = _run()
    assert first == second
    ids = [row["id"] for row in first["strategies"]]
    assert ids == ["unhedged", "delta", "lots_delta", "lots_gemini"]
    by_id = {row["id"]: row for row in first["strategies"]}
    assert _span(by_id["unhedged"]) > _span(by_id["lots_delta"])
    assert _span(by_id["unhedged"]) > _span(by_id["lots_gemini"])


def test_simulation_endpoint_matches_schema() -> None:
    clear_simulation_cache()
    first = CLIENT.get("/simulation")
    second = CLIENT.get("/simulation")
    assert first.status_code == 200
    assert first.json() == second.json()
    schema = json.loads(SCHEMA.read_text())
    Draft202012Validator(schema, format_checker=Draft202012Validator.FORMAT_CHECKER).validate(
        first.json()
    )
