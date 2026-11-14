"""Injectable market-data clients (tests never hit the network)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Protocol

import httpx

from oddlot_pricer.config import OddlotConfig, get_config
from oddlot_pricer.pricing.crowd import GeminiBucket


@dataclass
class MarketSnapshot:
    spot: Decimal
    sigma_by_strike: dict[Decimal, float]
    r: Decimal
    gemini_buckets: list[GeminiBucket]
    asof: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def sigma_for(self, strike: Decimal, fallback: float) -> float:
        if strike in self.sigma_by_strike:
            return self.sigma_by_strike[strike]
        if not self.sigma_by_strike:
            return fallback
        nearest = min(self.sigma_by_strike.keys(), key=lambda k: abs(k - strike))
        return self.sigma_by_strike[nearest]


class MarketDataProvider(Protocol):
    def snapshot(self) -> MarketSnapshot: ...


@dataclass
class StaticMarketData:
    """Fixture provider for unit tests and offline demos."""

    spot: Decimal
    r: Decimal
    gemini_buckets: list[GeminiBucket]
    sigma: float = 0.16

    def snapshot(self) -> MarketSnapshot:
        return MarketSnapshot(
            spot=self.spot,
            sigma_by_strike={},
            r=self.r,
            gemini_buckets=list(self.gemini_buckets),
        )


def _parse_optional_decimal(value: object | None) -> Decimal | None:
    if value is None or value == "" or value == "none":
        return None
    return Decimal(str(value))


def parse_gemini_event_payload(payload: dict) -> list[GeminiBucket]:
    contracts = payload.get("contracts") or payload.get("markets") or []
    buckets: list[GeminiBucket] = []
    for contract in contracts:
        label = (
            contract.get("label")
            or contract.get("title")
            or contract.get("name")
            or ""
        )
        prices = contract.get("prices") or {}
        bid = _parse_optional_decimal(
            prices.get("bestBid", contract.get("bestBid", contract.get("bid")))
        )
        ask = _parse_optional_decimal(
            prices.get("bestAsk", contract.get("bestAsk", contract.get("ask")))
        )
        if not label:
            continue
        buckets.append(GeminiBucket(label=str(label), bid=bid, ask=ask))
    return buckets


@dataclass
class LiveMarketData:
    """Thin live clients. Failures fall back to config defaults."""

    config: OddlotConfig = field(default_factory=get_config)
    http_timeout_s: float = 5.0

    def fetch_gemini_buckets(self) -> list[GeminiBucket]:
        url = (
            f"{self.config.pricing.gemini_base.rstrip('/')}"
            f"/v1/prediction-markets/events/{self.config.pricing.gemini_event}"
        )
        try:
            response = httpx.get(url, timeout=self.http_timeout_s)
            response.raise_for_status()
            return parse_gemini_event_payload(response.json())
        except Exception:
            return []

    def fetch_spot(self) -> Decimal | None:
        feed = self.config.pyth_feed_id
        url = f"https://hermes.pyth.network/v2/updates/price/latest?ids[]={feed}"
        try:
            response = httpx.get(url, timeout=self.http_timeout_s)
            response.raise_for_status()
            payload = response.json()
            parsed = payload.get("parsed") or []
            if not parsed:
                return None
            price_obj = parsed[0].get("price") or {}
            price = Decimal(str(price_obj["price"]))
            expo = int(price_obj.get("expo", 0))
            return price * (Decimal(10) ** expo)
        except Exception:
            return None

    def fetch_iv_and_ratio(self) -> tuple[dict[Decimal, float], Decimal]:
        sigma_by_strike: dict[Decimal, float] = {}
        ratio = self.config.pricing.spx_ratio_fallback
        try:
            import yfinance as yf

            spy = yf.Ticker("SPY")
            gspc = yf.Ticker("^GSPC")
            spy_hist = spy.history(period="5d")
            spx_hist = gspc.history(period="5d")
            if not spy_hist.empty and not spx_hist.empty:
                spy_close = Decimal(str(spy_hist["Close"].iloc[-1]))
                spx_close = Decimal(str(spx_hist["Close"].iloc[-1]))
                if spx_close > 0:
                    ratio = spy_close / spx_close

            expiries = list(getattr(spy, "options", []) or [])
            if expiries:
                chain = spy.option_chain(expiries[0])
                for _, row in chain.calls.iterrows():
                    strike = Decimal(str(row["strike"]))
                    iv = row.get("impliedVolatility")
                    if iv is not None and float(iv) > 0:
                        sigma_by_strike[strike] = float(iv)
        except Exception:
            pass
        return sigma_by_strike, ratio

    def snapshot(self) -> MarketSnapshot:
        spot = self.fetch_spot() or Decimal("780")
        sigma_by_strike, r = self.fetch_iv_and_ratio()
        buckets = self.fetch_gemini_buckets()
        return MarketSnapshot(
            spot=spot,
            sigma_by_strike=sigma_by_strike,
            r=r,
            gemini_buckets=buckets,
        )
