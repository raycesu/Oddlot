"""Load shared config/oddlot.json."""

from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = ROOT / "config" / "oddlot.json"


@dataclass(frozen=True)
class PricingConfig:
    spread: Decimal
    min_premium: Decimal
    rate: float
    crowd_min_coverage: Decimal
    gemini_base: str
    gemini_event: str
    spx_ratio_fallback: Decimal


@dataclass(frozen=True)
class HedgingConfig:
    round_lot: int
    delta_band_shares: float
    rehedge_interval_s: int
    spyx_cost_bps: int


@dataclass(frozen=True)
class YearEndConfig:
    expiry: str
    strike_step: int
    strike_band_pct: float
    widths: list[int]
    kinds: list[str]
    max_open_interest: int
    buy_cutoff_s: int


@dataclass(frozen=True)
class DemoConfig:
    expiry_after_s: int
    buy_cutoff_s: int
    widths: list[int]
    max_open_interest: int
    sigma: float
    replay_file: str


@dataclass(frozen=True)
class OddlotConfig:
    cluster: str
    underlying: str
    pyth_feed_id: str
    usdc_mint: str
    program_id: str
    pricing: PricingConfig
    hedging: HedgingConfig
    year_end: YearEndConfig
    demo: DemoConfig
    raw: dict[str, Any]


def _decimal(value: Any) -> Decimal:
    return Decimal(str(value))


def load_config(path: Path | None = None) -> OddlotConfig:
    config_path = path or DEFAULT_CONFIG_PATH
    raw = json.loads(config_path.read_text())
    pricing_raw = raw["pricing"]
    hedging_raw = raw["hedging"]
    year_end_raw = raw["year_end"]
    demo_raw = raw["demo"]
    return OddlotConfig(
        cluster=raw["cluster"],
        underlying=raw["underlying"],
        pyth_feed_id=raw["pyth_feed_id"],
        usdc_mint=raw["usdc_mint"],
        program_id=raw["program_id"],
        pricing=PricingConfig(
            spread=_decimal(pricing_raw["spread"]),
            min_premium=_decimal(pricing_raw["min_premium"]),
            rate=float(pricing_raw["rate"]),
            crowd_min_coverage=_decimal(pricing_raw["crowd_min_coverage"]),
            gemini_base=pricing_raw["gemini_base"],
            gemini_event=pricing_raw["gemini_event"],
            spx_ratio_fallback=_decimal(pricing_raw["spx_ratio_fallback"]),
        ),
        hedging=HedgingConfig(
            round_lot=int(hedging_raw["round_lot"]),
            delta_band_shares=float(hedging_raw["delta_band_shares"]),
            rehedge_interval_s=int(hedging_raw["rehedge_interval_s"]),
            spyx_cost_bps=int(hedging_raw["spyx_cost_bps"]),
        ),
        year_end=YearEndConfig(
            expiry=year_end_raw["expiry"],
            strike_step=int(year_end_raw["strike_step"]),
            strike_band_pct=float(year_end_raw["strike_band_pct"]),
            widths=[int(w) for w in year_end_raw["widths"]],
            kinds=[str(k) for k in year_end_raw["kinds"]],
            max_open_interest=int(year_end_raw["max_open_interest"]),
            buy_cutoff_s=int(year_end_raw["buy_cutoff_s"]),
        ),
        demo=DemoConfig(
            expiry_after_s=int(demo_raw["expiry_after_s"]),
            buy_cutoff_s=int(demo_raw["buy_cutoff_s"]),
            widths=[int(w) for w in demo_raw["widths"]],
            max_open_interest=int(demo_raw["max_open_interest"]),
            sigma=float(demo_raw["sigma"]),
            replay_file=demo_raw["replay_file"],
        ),
        raw=raw,
    )


@lru_cache(maxsize=1)
def get_config() -> OddlotConfig:
    return load_config()
