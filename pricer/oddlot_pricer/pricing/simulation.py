"""LP P&L simulation: 1,000 GBM paths and four hedge strategies."""

from __future__ import annotations

import math
import re
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import numpy as np

from oddlot_pricer.pricing.bs import call_spread, call_spread_delta, put_spread, put_spread_delta
from oddlot_pricer.pricing.crowd import GeminiBucket
from oddlot_pricer.pricing.payoff import spread_payoff

PATHS = 1000
VOL = 0.16
TRADES_PER_DAY = 20
SEED = 20261118
STRATEGY_IDS = ("unhedged", "delta", "lots_delta", "lots_gemini")

_RANGE_RE = re.compile(r"^([\d,]+(?:\.\d+)?)\s+to\s+([\d,]+(?:\.\d+)?)$", re.IGNORECASE)
_BELOW_RE = re.compile(r"^([\d,]+(?:\.\d+)?)\s+or\s+below$", re.IGNORECASE)
_ABOVE_RE = re.compile(r"^([\d,]+(?:\.\d+)?)\s+or\s+above$", re.IGNORECASE)

_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _money(value: float) -> str:
    return f"{value:.2f}"


def _bucket_mask(label: str, spx: np.ndarray) -> np.ndarray:
    text = label.strip()
    range_match = _RANGE_RE.match(text)
    if range_match:
        low = float(range_match.group(1).replace(",", ""))
        high = float(range_match.group(2).replace(",", ""))
        return (spx >= low) & (spx <= high)
    below_match = _BELOW_RE.match(text)
    if below_match:
        bound = float(below_match.group(1).replace(",", ""))
        return spx <= bound
    above_match = _ABOVE_RE.match(text)
    if above_match:
        bound = float(above_match.group(1).replace(",", ""))
        return spx >= bound
    return np.zeros(spx.shape, dtype=bool)


def _spread_payoff(settle: np.ndarray, kind: str, strike: float, width: float) -> np.ndarray:
    if kind == "call":
        intrinsic = settle - strike
    else:
        intrinsic = strike - settle
    return np.clip(intrinsic, 0.0, width)


def _stats(values: np.ndarray) -> dict[str, str]:
    mean = float(np.mean(values))
    p05, p50, p95 = (float(v) for v in np.percentile(values, [5, 50, 95]))
    return {
        "mean_pnl": _money(mean),
        "p05": _money(p05),
        "p50": _money(p50),
        "p95": _money(p95),
    }


def run_simulation(
    *,
    spot: float,
    expiry: datetime,
    now: datetime,
    strike_step: int,
    width: float,
    buckets: list[GeminiBucket],
    r: Decimal,
    cost_bps: int,
    seed: int = SEED,
) -> dict[str, Any]:
    """Compare four hedges on one seeded trade schedule and 1,000 price paths."""
    seconds = max((expiry - now).total_seconds(), 86400.0)
    years = seconds / (365.0 * 86400.0)
    days = max(1, int(round(years * 365.0)))
    dt = 1.0 / 365.0
    rng = np.random.default_rng(seed)
    shocks = rng.standard_normal((PATHS, days))
    log_steps = (-0.5 * VOL * VOL * dt) + VOL * math.sqrt(dt) * shocks
    terminal = spot * np.exp(np.sum(log_steps, axis=1))

    sizes = rng.integers(1, 51, size=(days, TRADES_PER_DAY))
    is_call = rng.random((days, TRADES_PER_DAY)) < 0.6
    call_qty = int(sizes[is_call].sum())
    put_qty = int(sizes[~is_call].sum())

    strike = float(round(spot / strike_step) * strike_step)
    call_prem = call_spread(spot, strike, width, years, VOL, VOL)
    put_prem = put_spread(spot, strike, width, years, VOL, VOL)
    call_delta = call_spread_delta(spot, strike, width, years, VOL, VOL)
    put_delta = put_spread_delta(spot, strike, width, years, VOL, VOL)

    call_pay = _spread_payoff(terminal, "call", strike, width)
    put_pay = _spread_payoff(terminal, "put", strike, width)
    premium = call_qty * call_prem + put_qty * put_prem
    payoff = call_qty * call_pay + put_qty * put_pay
    unhedged = premium - payoff

    # Short the option, so the hedge holds the opposite delta.
    shares = -(call_qty * call_delta + put_qty * put_delta)
    trade_cost = abs(shares) * spot * (cost_bps / 10_000.0)
    delta_pnl = unhedged + shares * (terminal - spot) - trade_cost

    call_lots = call_qty // 100
    put_lots = put_qty // 100
    call_resid = call_qty - 100 * call_lots
    put_resid = put_qty - 100 * put_lots
    # Listed spreads are paper-filled at BS, so round lots net to zero.
    resid_premium = call_resid * call_prem + put_resid * put_prem
    resid_payoff = call_resid * call_pay + put_resid * put_pay
    resid_unhedged = resid_premium - resid_payoff
    resid_shares = -(call_resid * call_delta + put_resid * put_delta)
    resid_cost = abs(resid_shares) * spot * (cost_bps / 10_000.0)
    lots_delta = resid_unhedged + resid_shares * (terminal - spot) - resid_cost

    gemini_receipt, gemini_cost = _gemini_residual(
        call_resid,
        put_resid,
        strike,
        width,
        r,
        buckets,
        terminal,
    )
    lots_gemini = resid_premium - gemini_cost + gemini_receipt - resid_payoff

    rows = {
        "unhedged": unhedged,
        "delta": delta_pnl,
        "lots_delta": lots_delta,
        "lots_gemini": lots_gemini,
    }
    asof = now.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "asof": asof,
        "spot": _money(spot),
        "paths": PATHS,
        "strategies": [{"id": name, **_stats(rows[name])} for name in STRATEGY_IDS],
    }


def _gemini_residual(
    call_resid: int,
    put_resid: int,
    strike: float,
    width: float,
    r: Decimal,
    buckets: list[GeminiBucket],
    terminal: np.ndarray,
) -> tuple[np.ndarray, float]:
    receipt = np.zeros(terminal.shape, dtype=float)
    cost = 0.0
    if not buckets or r <= 0:
        return receipt, cost
    spx = terminal / float(r)
    for bucket in buckets:
        if bucket.ask is None:
            continue
        for kind, residual in (("call", call_resid), ("put", put_resid)):
            if residual <= 0:
                continue
            payoff = spread_payoff(r * bucket.midpoint, kind, Decimal(str(strike)), Decimal(str(width)))
            contracts = int(math.ceil(float(residual) * float(payoff))) if payoff > 0 else 0
            if contracts <= 0:
                continue
            cost += contracts * float(bucket.ask)
            receipt = receipt + np.where(_bucket_mask(bucket.label, spx), float(contracts), 0.0)
    return receipt, cost


def cached_simulation(fingerprint: str, payload_factory) -> dict[str, Any]:
    now = time.monotonic()
    cached = _cache.get(fingerprint)
    if cached is not None and now - cached[0] < 60.0:
        return cached[1]
    payload = payload_factory()
    _cache[fingerprint] = (now, payload)
    return payload


def clear_simulation_cache() -> None:
    _cache.clear()
