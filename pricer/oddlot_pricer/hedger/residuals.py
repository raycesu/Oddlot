"""Paper residual hedges: Gemini buckets (year-end) or SPYx delta (other)."""

from __future__ import annotations

import math
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from oddlot_pricer.pricing.bs import call_spread_delta, put_spread_delta
from oddlot_pricer.pricing.crowd import GeminiBucket
from oddlot_pricer.pricing.payoff import spread_payoff


@dataclass(frozen=True)
class GeminiPaperTarget:
    label: str
    contracts: int
    ask: Decimal | None
    bid: Decimal | None = None


@dataclass(frozen=True)
class SpyxPaperHedge:
    shares: Decimal
    fill: Decimal


def gemini_residual_targets(
    residual: int,
    buckets: list[GeminiBucket],
    kind: Literal["call", "put"],
    strike: Decimal,
    width: Decimal,
    r: Decimal,
) -> list[GeminiPaperTarget]:
    targets: list[GeminiPaperTarget] = []
    for bucket in buckets:
        payoff = spread_payoff(r * bucket.midpoint, kind, strike, width)
        raw = Decimal(residual) * payoff
        contracts = int(math.ceil(float(raw))) if raw > 0 else 0
        targets.append(
            GeminiPaperTarget(
                label=bucket.label,
                contracts=contracts,
                ask=bucket.ask,
                bid=bucket.bid,
            )
        )
    return targets


def spyx_delta_hedge(
    residual: int,
    spot: float,
    kind: Literal["call", "put"],
    strike: float,
    width: float,
    t: float,
    sigma: float,
    cost_bps: int,
) -> SpyxPaperHedge:
    if kind == "call":
        token_delta = call_spread_delta(spot, strike, width, t, sigma, sigma)
    else:
        token_delta = put_spread_delta(spot, strike, width, t, sigma, sigma)
    shares = Decimal(str(residual * token_delta))
    bps = Decimal(cost_bps) / Decimal("10000")
    if shares >= 0:
        fill = Decimal(str(spot)) * (Decimal("1") + bps)
    else:
        fill = Decimal(str(spot)) * (Decimal("1") - bps)
    return SpyxPaperHedge(shares=shares, fill=fill)
