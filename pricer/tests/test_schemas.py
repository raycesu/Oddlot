"""M0: pricer stub responses validate against frozen schemas/api/*.json."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator

from oddlot_pricer.api.main import app

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "schemas" / "api"
CLIENT = TestClient(app)


def validate(schema_name: str, payload: dict) -> None:
    schema = json.loads((SCHEMA_DIR / schema_name).read_text())
    Draft202012Validator(
        schema,
        format_checker=Draft202012Validator.FORMAT_CHECKER,
    ).validate(payload)


def test_quotes_schema() -> None:
    response = CLIENT.get("/quotes")
    assert response.status_code == 200
    validate("quotes.schema.json", response.json())


def test_book_schema() -> None:
    response = CLIENT.get("/book")
    assert response.status_code == 200
    validate("book.schema.json", response.json())


def test_distribution_schema() -> None:
    response = CLIENT.get("/distribution")
    assert response.status_code == 200
    validate("distribution.schema.json", response.json())


def test_trades_schema() -> None:
    response = CLIENT.get("/trades")
    assert response.status_code == 200
    validate("trades.schema.json", response.json())
