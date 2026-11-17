"""Pydantic models mirroring schemas/api/*.schema.json (frozen at M0)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class QuoteItem(BaseModel):
    series: str
    underlying: str
    kind: Literal["call", "put"]
    strike: str
    width: str
    expiry: str
    premium: str
    bs_premium: str
    crowd_premium: str
    iv: str
    source: Literal["bs", "crowd"]


class QuotesResponse(BaseModel):
    asof: str
    spot: str
    quotes: list[QuoteItem] = Field(default_factory=list)


class BookSeries(BaseModel):
    series: str
    open_interest: int
    lots_hedged: int
    residual: int


class ListedSpread(BaseModel):
    series: str
    qty: int
    fill: str
    ts: str


class GeminiHolding(BaseModel):
    label: str
    contracts: int
    avg_price: str


class Pnl(BaseModel):
    premiums: str
    hedge_mark: str
    net: str


class BookResponse(BaseModel):
    asof: str
    series: list[BookSeries] = Field(default_factory=list)
    listed_spreads: list[ListedSpread] = Field(default_factory=list)
    gemini: list[GeminiHolding] = Field(default_factory=list)
    spyx_shares: str = "0.00"
    pnl: Pnl = Field(
        default_factory=lambda: Pnl(premiums="0.00", hedge_mark="0.00", net="0.00")
    )


class DistributionBucket(BaseModel):
    label: str
    spy_mid: str
    crowd_prob: str
    bs_prob: str
    bid: str | None
    ask: str | None


class DistributionResponse(BaseModel):
    event: str
    r: str
    coverage: str
    buckets: list[DistributionBucket] = Field(default_factory=list)


class TradeItem(BaseModel):
    signature: str
    ts: str
    buyer: str
    series: str
    kind: Literal["call", "put"]
    qty: int
    cost: str


class TradesResponse(BaseModel):
    trades: list[TradeItem] = Field(default_factory=list)


class SimulationStrategy(BaseModel):
    id: Literal["unhedged", "delta", "lots_delta", "lots_gemini"]
    mean_pnl: str
    p05: str
    p50: str
    p95: str


class SimulationResponse(BaseModel):
    asof: str
    spot: str
    paths: int
    strategies: list[SimulationStrategy]
