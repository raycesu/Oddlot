"""Build /quotes and /distribution payloads from a market snapshot."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from oddlot_pricer.config import OddlotConfig
from oddlot_pricer.pricing.bs import call_spread, put_spread, years_to_expiry
from oddlot_pricer.pricing.crowd import coverage_ratio, crowd_premium
from oddlot_pricer.pricing.market_data import MarketSnapshot
from oddlot_pricer.pricing.quote import build_quote


@dataclass(frozen=True)
class SeriesSpec:
    series: str
    underlying: str
    kind: Literal["call", "put"]
    strike: Decimal
    width: Decimal
    expiry: str
    year_end: bool = True


def year_end_grid(config: OddlotConfig, spot: Decimal) -> list[SeriesSpec]:
    step = Decimal(config.year_end.strike_step)
    band = Decimal(str(config.year_end.strike_band_pct)) / Decimal("100")
    low = (spot * (Decimal("1") - band) / step).to_integral_value() * step
    high = (spot * (Decimal("1") + band) / step).to_integral_value() * step
    specs: list[SeriesSpec] = []
    strike = low
    while strike <= high:
        for width in config.year_end.widths:
            for kind in config.year_end.kinds:
                kind_lit: Literal["call", "put"] = "call" if kind == "call" else "put"
                if kind_lit == "put" and strike - Decimal(width) <= 0:
                    continue
                series = f"{config.underlying}-{kind_lit}-{strike}-{width}"
                specs.append(
                    SeriesSpec(
                        series=series,
                        underlying=config.underlying,
                        kind=kind_lit,
                        strike=strike,
                        width=Decimal(width),
                        expiry=config.year_end.expiry,
                        year_end=True,
                    )
                )
        strike += step
    return specs


def _bs_premium(
    snapshot: MarketSnapshot,
    spec: SeriesSpec,
    config: OddlotConfig,
    now: datetime,
) -> Decimal:
    expiry = datetime.fromisoformat(spec.expiry.replace("Z", "+00:00"))
    t = years_to_expiry(expiry.timestamp(), now.timestamp())
    sigma_long = snapshot.sigma_for(spec.strike, config.demo.sigma)
    if spec.kind == "call":
        short_strike = spec.strike + spec.width
        sigma_short = snapshot.sigma_for(short_strike, config.demo.sigma)
        value = call_spread(
            float(snapshot.spot),
            float(spec.strike),
            float(spec.width),
            t,
            sigma_long,
            sigma_short,
            config.pricing.rate,
        )
    else:
        short_strike = spec.strike - spec.width
        sigma_short = snapshot.sigma_for(short_strike, config.demo.sigma)
        value = put_spread(
            float(snapshot.spot),
            float(spec.strike),
            float(spec.width),
            t,
            sigma_long,
            sigma_short,
            config.pricing.rate,
        )
    return Decimal(str(round(value, 4)))


def build_quotes_payload(
    snapshot: MarketSnapshot,
    series_list: list[SeriesSpec],
    config: OddlotConfig,
    now: datetime | None = None,
) -> dict:
    stamp = now or datetime.now(timezone.utc)
    asof = stamp.isoformat().replace("+00:00", "Z")
    quotes = []
    for spec in series_list:
        bs = _bs_premium(snapshot, spec, config, stamp)
        if spec.year_end and snapshot.gemini_buckets:
            crowd = crowd_premium(
                buckets=snapshot.gemini_buckets,
                kind=spec.kind,
                strike=spec.strike,
                width=spec.width,
                r=snapshot.r,
                min_coverage=config.pricing.crowd_min_coverage,
            )
            crowd_value = crowd.premium
            crowd_ok = crowd.available
        else:
            crowd_value = Decimal("0")
            crowd_ok = False
        quote = build_quote(
            bs_premium=bs,
            crowd_premium=crowd_value,
            spread=config.pricing.spread,
            min_premium=config.pricing.min_premium,
            crowd_available=crowd_ok,
        )
        sigma = snapshot.sigma_for(spec.strike, config.demo.sigma)
        quotes.append(
            {
                "series": spec.series,
                "underlying": spec.underlying,
                "kind": spec.kind,
                "strike": f"{spec.strike:.2f}",
                "width": f"{spec.width:.2f}",
                "expiry": spec.expiry,
                "premium": f"{quote.premium:.2f}",
                "bs_premium": f"{quote.bs_premium:.4f}",
                "crowd_premium": f"{quote.crowd_premium:.2f}",
                "iv": f"{sigma:.4f}",
                "source": quote.source,
            }
        )
    return {
        "asof": asof,
        "spot": f"{snapshot.spot:.2f}",
        "quotes": quotes,
    }


def build_distribution_payload(
    snapshot: MarketSnapshot,
    config: OddlotConfig,
    spot_for_bs: Decimal | None = None,
) -> dict:
    buckets_out = []
    coverage = coverage_ratio(snapshot.gemini_buckets) if snapshot.gemini_buckets else Decimal("0")
    total_est = sum(
        (b.estimate or Decimal("0")) for b in snapshot.gemini_buckets
    ) or Decimal("1")
    spot = float(spot_for_bs or snapshot.spot)
    # Simple BS bucket prob proxy: normal density around spot via SPY mids
    for bucket in snapshot.gemini_buckets:
        spy_mid = snapshot.r * bucket.midpoint
        estimate = bucket.estimate or Decimal("0")
        crowd_prob = estimate / total_est
        # Distance-based proxy for display (not used for pricing)
        distance = abs(float(spy_mid) - spot)
        weight = 1.0 / (1.0 + distance)
        buckets_out.append((bucket, spy_mid, crowd_prob, weight))

    weight_sum = sum(w for _, _, _, w in buckets_out) or 1.0
    return {
        "event": config.pricing.gemini_event,
        "r": f"{snapshot.r:.4f}",
        "coverage": f"{coverage:.3f}",
        "buckets": [
            {
                "label": bucket.label,
                "spy_mid": f"{spy_mid:.2f}",
                "crowd_prob": f"{crowd_prob:.4f}",
                "bs_prob": f"{(weight / weight_sum):.4f}",
                "bid": None if bucket.bid is None else f"{bucket.bid:.2f}",
                "ask": None if bucket.ask is None else f"{bucket.ask:.2f}",
            }
            for bucket, spy_mid, crowd_prob, weight in buckets_out
        ],
    }


def default_series_registry(config: OddlotConfig, spot: Decimal) -> list[SeriesSpec]:
    return year_end_grid(config, spot)
