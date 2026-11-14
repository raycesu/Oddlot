"""M2: Gemini label parsing and crowd pricing."""

from __future__ import annotations

from decimal import Decimal

from oddlot_pricer.pricing.crowd import (
    GeminiBucket,
    crowd_premium,
    parse_label_midpoint,
    coverage_ratio,
)


def test_label_parse_range() -> None:
    assert parse_label_midpoint("7,400 to 7,599.99") == Decimal("7500")


def test_label_parse_or_below() -> None:
    assert parse_label_midpoint("7,399.99 or below") == Decimal("7399.99")


def test_label_parse_or_above() -> None:
    assert parse_label_midpoint("8,200.01 or above") == Decimal("8200.01")


def test_toy_coverage(toy_gemini_buckets: list[GeminiBucket]) -> None:
    coverage = coverage_ratio(toy_gemini_buckets)
    assert abs(float(coverage) - 0.876) < 1e-3


def test_crowd_call_780_800(toy_gemini_buckets: list[GeminiBucket]) -> None:
    result = crowd_premium(
        buckets=toy_gemini_buckets,
        kind="call",
        strike=Decimal("780"),
        width=Decimal("20"),
        r=Decimal("0.1"),
        min_coverage=Decimal("0.8"),
    )
    assert result.available
    assert result.premium == Decimal("6.20")
    assert abs(float(result.coverage) - 0.876) < 1e-3


def test_crowd_put_780_740(toy_gemini_buckets: list[GeminiBucket]) -> None:
    result = crowd_premium(
        buckets=toy_gemini_buckets,
        kind="put",
        strike=Decimal("780"),
        width=Decimal("40"),
        r=Decimal("0.1"),
        min_coverage=Decimal("0.8"),
    )
    assert result.available
    assert result.premium == Decimal("10.90")


def test_crowd_unavailable_low_coverage() -> None:
    buckets = [
        GeminiBucket(label="7,400 to 7,599.99", bid=Decimal("0.12"), ask=Decimal("0.16")),
        GeminiBucket(label="7,600 to 7,799.99", bid=None, ask=Decimal("0.50")),
        GeminiBucket(label="7,800 to 7,999.99", bid=None, ask=Decimal("0.40")),
    ]
    result = crowd_premium(
        buckets=buckets,
        kind="call",
        strike=Decimal("780"),
        width=Decimal("20"),
        r=Decimal("0.1"),
        min_coverage=Decimal("0.8"),
    )
    assert not result.available
    assert result.premium == Decimal("0")


def test_crowd_unavailable_missing_ask_on_positive_payoff() -> None:
    buckets = [
        GeminiBucket(label="7,399.99 or below", bid=Decimal("0.05"), ask=Decimal("0.10")),
        GeminiBucket(label="7,400 to 7,599.99", bid=Decimal("0.12"), ask=Decimal("0.16")),
        GeminiBucket(label="7,600 to 7,799.99", bid=Decimal("0.17"), ask=Decimal("0.21")),
        GeminiBucket(label="7,800 to 7,999.99", bid=Decimal("0.20"), ask=None),
        GeminiBucket(label="8,000 to 8,199.99", bid=Decimal("0.09"), ask=Decimal("0.13")),
        GeminiBucket(label="8,200.01 or above", bid=Decimal("0.03"), ask=Decimal("0.06")),
    ]
    result = crowd_premium(
        buckets=buckets,
        kind="call",
        strike=Decimal("780"),
        width=Decimal("20"),
        r=Decimal("0.1"),
        min_coverage=Decimal("0.8"),
    )
    assert not result.available
    assert result.premium == Decimal("0")
