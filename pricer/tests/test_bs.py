"""M2: Black-Scholes reference numbers."""

from __future__ import annotations

from oddlot_pricer.pricing.bs import (
    black_scholes_call,
    call_spread,
    call_spread_delta,
    put_spread,
    put_spread_delta,
)


def test_bs_call_spread_780_800(ref_spot: float, ref_t: float, ref_sigma: float) -> None:
    value = call_spread(ref_spot, 780.0, 20.0, ref_t, ref_sigma, ref_sigma)
    assert abs(value - 8.0556) < 1e-4


def test_bs_put_spread_780_740(ref_spot: float, ref_t: float, ref_sigma: float) -> None:
    value = put_spread(ref_spot, 780.0, 40.0, ref_t, ref_sigma, ref_sigma)
    assert abs(value - 13.6854) < 1e-4


def test_token_delta_call_780_800(ref_spot: float, ref_t: float, ref_sigma: float) -> None:
    delta = call_spread_delta(ref_spot, 780.0, 20.0, ref_t, ref_sigma, ref_sigma)
    assert abs(delta - 0.1697) < 1e-4


def test_token_delta_put_780_740(ref_spot: float, ref_t: float, ref_sigma: float) -> None:
    delta = put_spread_delta(ref_spot, 780.0, 40.0, ref_t, ref_sigma, ref_sigma)
    assert abs(delta - (-0.3139)) < 1e-4


def test_sanity_30_day_780_call(ref_spot: float, ref_sigma: float) -> None:
    t = 30.0 / 365.0
    value = black_scholes_call(ref_spot, 780.0, t, ref_sigma, rate=0.0)
    assert abs(value - 14.27) < 5e-3
