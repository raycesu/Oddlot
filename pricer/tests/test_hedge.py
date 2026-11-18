"""P1: Gemini residual diffs fill at the ask and unwind at the bid."""

from __future__ import annotations

from decimal import Decimal

from oddlot_pricer.db.book import HedgeBook
from oddlot_pricer.hedger.events import BoughtEvent
from oddlot_pricer.pricing.crowd import GeminiBucket


def _event(qty: int, index: int) -> BoughtEvent:
    return BoughtEvent(
        buyer=b"\x11" * 32,
        series=b"\x22" * 32,
        qty=qty,
        cost=1_000_000,
        spot=780_000_000,
        ts=1_700_000_000,
        signature=f"hedge-{index}",
        event_index=index,
    )


def _buckets() -> list[GeminiBucket]:
    return [
        GeminiBucket(label="7,399.99 or below", bid=Decimal("0.08"), ask=Decimal("0.10")),
        GeminiBucket(label="7,400 to 7,599.99", bid=Decimal("0.12"), ask=None),
    ]


def _apply(book: HedgeBook, qty: int, index: int) -> None:
    book.apply_bought(
        _event(qty, index),
        kind="put",
        strike=Decimal("780"),
        width=Decimal("40"),
        fill_price=Decimal("4.00"),
        round_lot=100,
        year_end=True,
        buckets=_buckets(),
        r=Decimal("0.1"),
    )


def test_residual_44_buys_at_ask_and_skips_missing_ask(tmp_path) -> None:
    book = HedgeBook(f"sqlite:///{tmp_path / 'hedge.db'}")
    _apply(book, 44, 0)
    holdings = {row["label"]: row for row in book.to_book_dict()["gemini"]}
    assert set(holdings) == {"7,399.99 or below"}
    # Put 780/40 at SPY 739.999 pays the full $40 width. 44 * 40 = 1760.
    assert holdings["7,399.99 or below"]["contracts"] == 1760
    assert holdings["7,399.99 or below"]["avg_price"] == "0.10"
    # Paid 1760 * 0.10, marked at mid 0.09: -176.00 + 158.40.
    assert book.to_book_dict()["pnl"]["hedge_mark"] == "-17.60"


def test_smaller_residual_sells_the_difference_at_the_bid(tmp_path) -> None:
    book = HedgeBook(f"sqlite:///{tmp_path / 'hedge.db'}")
    _apply(book, 44, 0)
    # 44 + 66 = 110 → one listed lot and residual 10. 10 * 40 = 400 kept.
    _apply(book, 66, 1)
    holdings = {row["label"]: row for row in book.to_book_dict()["gemini"]}
    assert holdings["7,399.99 or below"]["contracts"] == 400
    assert holdings["7,399.99 or below"]["avg_price"] == "0.10"
    # Sold 1360 at 0.08. Cash -67.20 plus 400 * 0.09 mark.
    assert book.to_book_dict()["pnl"]["hedge_mark"] == "-31.20"
    assert "7,400 to 7,599.99" not in holdings
