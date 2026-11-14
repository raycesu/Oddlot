"""M2: quote formula reference numbers."""

from __future__ import annotations

from decimal import Decimal

from oddlot_pricer.pricing.quote import build_quote


def test_quote_call_780_800() -> None:
    result = build_quote(
        bs_premium=Decimal("8.0556"),
        crowd_premium=Decimal("6.20"),
        spread=Decimal("0.03"),
        min_premium=Decimal("0.05"),
    )
    assert result.premium == Decimal("8.30")
    assert result.source == "bs"


def test_quote_put_780_740() -> None:
    result = build_quote(
        bs_premium=Decimal("13.6854"),
        crowd_premium=Decimal("10.90"),
        spread=Decimal("0.03"),
        min_premium=Decimal("0.05"),
    )
    assert result.premium == Decimal("14.10")
    assert result.source == "bs"


def test_quote_uses_crowd_when_higher() -> None:
    result = build_quote(
        bs_premium=Decimal("5.00"),
        crowd_premium=Decimal("8.00"),
        spread=Decimal("0.03"),
        min_premium=Decimal("0.05"),
    )
    assert result.source == "crowd"
    assert result.premium == Decimal("8.24")


def test_quote_unavailable_crowd_is_zero() -> None:
    result = build_quote(
        bs_premium=Decimal("8.0556"),
        crowd_premium=Decimal("0"),
        spread=Decimal("0.03"),
        min_premium=Decimal("0.05"),
        crowd_available=False,
    )
    assert result.source == "bs"
    assert result.premium == Decimal("8.30")
