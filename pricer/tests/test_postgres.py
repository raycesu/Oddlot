"""P1: the hedge book can persist the trade tape in Postgres."""

from __future__ import annotations

import os
import uuid

import pytest

from oddlot_pricer.db.book import HedgeBook, TradeRow

DATABASE_URL = os.environ.get("DATABASE_URL", "")
pytestmark = pytest.mark.skipif(
    not DATABASE_URL.startswith(("postgres://", "postgresql://")),
    reason="DATABASE_URL is not a postgres URL",
)


def test_postgres_trade_roundtrip() -> None:
    signature = f"p1-{uuid.uuid4()}"
    book = HedgeBook(DATABASE_URL)
    try:
        book.add_trade(
            TradeRow(
                signature=signature,
                ts="2026-11-16T21:00:00Z",
                buyer="buyer",
                series="series",
                kind="put",
                qty=44,
                cost="12.00",
            )
        )
        rows = book.to_trades_dict()["trades"]
        match = next(row for row in rows if row["signature"] == signature)
        assert match["qty"] == 44
        assert match["cost"] == "12.00"
    finally:
        book._execute("DELETE FROM trades WHERE signature = ?", (signature,))
        book._conn.commit()
        book.close()
