"""Black-Scholes pricing and deltas (floats only inside option math)."""

from __future__ import annotations

import math

from scipy.stats import norm


def _d1_d2(spot: float, strike: float, t: float, sigma: float, rate: float = 0.0) -> tuple[float, float]:
    if t <= 0 or sigma <= 0 or spot <= 0 or strike <= 0:
        return 0.0, 0.0
    sqrt_t = math.sqrt(t)
    d1 = (math.log(spot / strike) + (rate + 0.5 * sigma * sigma) * t) / (sigma * sqrt_t)
    d2 = d1 - sigma * sqrt_t
    return d1, d2


def black_scholes_call(
    spot: float,
    strike: float,
    t: float,
    sigma: float,
    rate: float = 0.0,
) -> float:
    if t <= 0:
        return max(spot - strike, 0.0)
    d1, d2 = _d1_d2(spot, strike, t, sigma, rate)
    return spot * norm.cdf(d1) - strike * math.exp(-rate * t) * norm.cdf(d2)


def black_scholes_put(
    spot: float,
    strike: float,
    t: float,
    sigma: float,
    rate: float = 0.0,
) -> float:
    if t <= 0:
        return max(strike - spot, 0.0)
    d1, d2 = _d1_d2(spot, strike, t, sigma, rate)
    return strike * math.exp(-rate * t) * norm.cdf(-d2) - spot * norm.cdf(-d1)


def call_spread(
    spot: float,
    strike: float,
    width: float,
    t: float,
    sigma_long: float,
    sigma_short: float,
    rate: float = 0.0,
) -> float:
    long_leg = black_scholes_call(spot, strike, t, sigma_long, rate)
    short_leg = black_scholes_call(spot, strike + width, t, sigma_short, rate)
    return long_leg - short_leg


def put_spread(
    spot: float,
    strike: float,
    width: float,
    t: float,
    sigma_long: float,
    sigma_short: float,
    rate: float = 0.0,
) -> float:
    long_leg = black_scholes_put(spot, strike, t, sigma_long, rate)
    short_leg = black_scholes_put(spot, strike - width, t, sigma_short, rate)
    return long_leg - short_leg


def call_spread_delta(
    spot: float,
    strike: float,
    width: float,
    t: float,
    sigma_long: float,
    sigma_short: float,
    rate: float = 0.0,
) -> float:
    if t <= 0:
        in_long = 1.0 if spot > strike else 0.0
        in_short = 1.0 if spot > strike + width else 0.0
        return in_long - in_short
    d1_long, _ = _d1_d2(spot, strike, t, sigma_long, rate)
    d1_short, _ = _d1_d2(spot, strike + width, t, sigma_short, rate)
    return float(norm.cdf(d1_long) - norm.cdf(d1_short))


def put_spread_delta(
    spot: float,
    strike: float,
    width: float,
    t: float,
    sigma_long: float,
    sigma_short: float,
    rate: float = 0.0,
) -> float:
    # Put spread delta = N(d1(K)) − N(d1(K−W)) (negative for OTM puts)
    if t <= 0:
        in_long = -1.0 if spot < strike else 0.0
        in_short = -1.0 if spot < strike - width else 0.0
        return in_long - in_short
    d1_long, _ = _d1_d2(spot, strike, t, sigma_long, rate)
    d1_short, _ = _d1_d2(spot, strike - width, t, sigma_short, rate)
    return float(norm.cdf(d1_long) - norm.cdf(d1_short))


def years_to_expiry(expiry_ts: float, now_ts: float) -> float:
    return max((expiry_ts - now_ts) / (365.0 * 86400.0), 0.0)
