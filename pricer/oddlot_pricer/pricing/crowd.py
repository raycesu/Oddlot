"""Gemini crowd price: label parse, coverage, Σ ask × payoff."""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal

from oddlot_pricer.pricing.payoff import spread_payoff

_RANGE_RE = re.compile(
    r"^([\d,]+(?:\.\d+)?)\s+to\s+([\d,]+(?:\.\d+)?)$",
    re.IGNORECASE,
)
_BELOW_RE = re.compile(
    r"^([\d,]+(?:\.\d+)?)\s+or\s+below$",
    re.IGNORECASE,
)
_ABOVE_RE = re.compile(
    r"^([\d,]+(?:\.\d+)?)\s+or\s+above$",
    re.IGNORECASE,
)


def _parse_number(raw: str) -> Decimal:
    return Decimal(raw.replace(",", ""))


def parse_label_midpoint(label: str) -> Decimal:
    text = label.strip()
    range_match = _RANGE_RE.match(text)
    if range_match:
        low = _parse_number(range_match.group(1))
        high = _parse_number(range_match.group(2))
        return (low + high + Decimal("0.01")) / Decimal("2")

    below_match = _BELOW_RE.match(text)
    if below_match:
        return _parse_number(below_match.group(1))

    above_match = _ABOVE_RE.match(text)
    if above_match:
        return _parse_number(above_match.group(1))

    raise ValueError(f"unsupported Gemini label shape: {label!r}")


@dataclass(frozen=True)
class GeminiBucket:
    label: str
    bid: Decimal | None
    ask: Decimal | None

    @property
    def midpoint(self) -> Decimal:
        return parse_label_midpoint(self.label)

    @property
    def is_two_sided(self) -> bool:
        return self.bid is not None and self.ask is not None

    @property
    def estimate(self) -> Decimal | None:
        if self.is_two_sided:
            assert self.bid is not None and self.ask is not None
            return (self.bid + self.ask) / Decimal("2")
        if self.ask is not None:
            return self.ask
        if self.bid is not None:
            return self.bid
        return None


@dataclass(frozen=True)
class CrowdResult:
    premium: Decimal
    coverage: Decimal
    available: bool


def coverage_ratio(buckets: list[GeminiBucket]) -> Decimal:
    two_sided_sum = Decimal("0")
    all_sum = Decimal("0")
    for bucket in buckets:
        estimate = bucket.estimate
        if estimate is None:
            continue
        all_sum += estimate
        if bucket.is_two_sided:
            two_sided_sum += estimate
    if all_sum == 0:
        return Decimal("0")
    return two_sided_sum / all_sum


def crowd_premium(
    buckets: list[GeminiBucket],
    kind: Literal["call", "put"],
    strike: Decimal,
    width: Decimal,
    r: Decimal,
    min_coverage: Decimal,
) -> CrowdResult:
    coverage = coverage_ratio(buckets)
    if coverage < min_coverage:
        return CrowdResult(premium=Decimal("0"), coverage=coverage, available=False)

    total = Decimal("0")
    for bucket in buckets:
        spy_mid = r * bucket.midpoint
        payoff = spread_payoff(spy_mid, kind, strike, width)
        if payoff > 0 and bucket.ask is None:
            return CrowdResult(premium=Decimal("0"), coverage=coverage, available=False)
        if payoff > 0 and bucket.ask is not None:
            total += bucket.ask * payoff

    premium = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return CrowdResult(premium=premium, coverage=coverage, available=True)
