"""FastAPI surface — quotes, book, distribution, trades, QuickNode webhook."""

from __future__ import annotations

import json
import os
from decimal import Decimal
from typing import Any

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request

from oddlot_pricer.api.schemas import (
    BookResponse,
    DistributionResponse,
    QuotesResponse,
    TradesResponse,
)
from oddlot_pricer.config import OddlotConfig, get_config
from oddlot_pricer.db.book import HedgeBook
from oddlot_pricer.hedger.events import process_webhook_matches
from oddlot_pricer.pricing.crowd import GeminiBucket
from oddlot_pricer.pricing.engine import (
    SeriesSpec,
    build_distribution_payload,
    build_quotes_payload,
    default_series_registry,
)
from oddlot_pricer.pricing.market_data import (
    LiveMarketData,
    MarketDataProvider,
    MarketSnapshot,
    StaticMarketData,
)

app = FastAPI(title="Oddlot Pricer", version="0.2.0")


class PricerState:
    def __init__(
        self,
        config: OddlotConfig | None = None,
        market: MarketDataProvider | None = None,
        book: HedgeBook | None = None,
        series: list[SeriesSpec] | None = None,
    ) -> None:
        self.config = config or get_config()
        self.market = market or LiveMarketData(config=self.config)
        # Vercel’s function FS is read-only except /tmp
        default_db = (
            "sqlite:////tmp/oddlot.db"
            if os.environ.get("VERCEL") == "1"
            else "sqlite:///./oddlot.db"
        )
        db_url = os.environ.get("DATABASE_URL", default_db)
        self.book = book or HedgeBook(db_url)
        self.series = series
        self.stream_token = os.environ.get("QUICKNODE_STREAM_TOKEN", "")

    def snapshot(self) -> MarketSnapshot:
        return self.market.snapshot()

    def series_list(self, snapshot: MarketSnapshot) -> list[SeriesSpec]:
        if self.series is not None:
            return self.series
        return default_series_registry(self.config, snapshot.spot)


def _default_state() -> PricerState:
    # Prefer static demo data when OFFLINE_PRICER=1 (CI / local without keys)
    if os.environ.get("OFFLINE_PRICER", "").lower() in {"1", "true", "yes"}:
        config = get_config()
        buckets = [
            GeminiBucket(label="7,399.99 or below", bid=None, ask=Decimal("0.10")),
            GeminiBucket(label="7,400 to 7,599.99", bid=Decimal("0.12"), ask=Decimal("0.16")),
            GeminiBucket(label="7,600 to 7,799.99", bid=Decimal("0.17"), ask=Decimal("0.21")),
            GeminiBucket(label="7,800 to 7,999.99", bid=Decimal("0.20"), ask=Decimal("0.24")),
            GeminiBucket(label="8,000 to 8,199.99", bid=Decimal("0.09"), ask=Decimal("0.13")),
            GeminiBucket(label="8,200.01 or above", bid=Decimal("0.03"), ask=Decimal("0.06")),
        ]
        market = StaticMarketData(
            spot=Decimal("780"),
            r=config.pricing.spx_ratio_fallback,
            gemini_buckets=buckets,
            sigma=config.demo.sigma,
        )
        return PricerState(config=config, market=market)
    return PricerState()


STATE = _default_state()


def get_state() -> PricerState:
    return STATE


def set_state(state: PricerState) -> None:
    global STATE
    STATE = state


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "oddlot-pricer"}


@app.get("/quotes", response_model=QuotesResponse)
def get_quotes() -> QuotesResponse:
    state = get_state()
    snapshot = state.snapshot()
    payload = build_quotes_payload(
        snapshot,
        state.series_list(snapshot),
        state.config,
    )
    return QuotesResponse.model_validate(payload)


@app.get("/book", response_model=BookResponse)
def get_book() -> BookResponse:
    state = get_state()
    return BookResponse.model_validate(state.book.to_book_dict())


@app.get("/distribution", response_model=DistributionResponse)
def get_distribution() -> DistributionResponse:
    state = get_state()
    snapshot = state.snapshot()
    payload = build_distribution_payload(snapshot, state.config)
    return DistributionResponse.model_validate(payload)


@app.get("/trades", response_model=TradesResponse)
def get_trades() -> TradesResponse:
    state = get_state()
    return TradesResponse.model_validate(state.book.to_trades_dict())


def _hedge_bought_events(events: list[Any]) -> None:
    state = get_state()
    snapshot = state.snapshot()
    for event in events:
        # Series metadata unknown from event alone in M2 — treat as year-end put 780/40 default
        # unless a registered series hex matches.
        kind = "put"
        strike = Decimal("780")
        width = Decimal("40")
        series_hex = event.series.hex()
        for spec in state.series_list(snapshot):
            if spec.series == series_hex or spec.series.endswith(series_hex[:8]):
                kind = spec.kind
                strike = spec.strike
                width = spec.width
                break
        fill = Decimal("0")
        for quote in build_quotes_payload(
            snapshot,
            [
                SeriesSpec(
                    series=series_hex,
                    underlying=state.config.underlying,
                    kind=kind,
                    strike=strike,
                    width=width,
                    expiry=state.config.year_end.expiry,
                )
            ],
            state.config,
        )["quotes"]:
            fill = Decimal(quote["bs_premium"])
        state.book.apply_bought(
            event,
            kind=kind,
            strike=strike,
            width=width,
            fill_price=fill,
            round_lot=state.config.hedging.round_lot,
            year_end=True,
            buckets=snapshot.gemini_buckets,
            r=snapshot.r,
        )


@app.post("/webhook/quicknode")
async def webhook_quicknode(
    request: Request,
    background_tasks: BackgroundTasks,
    x_quicknode_token: str | None = Header(default=None),
) -> dict[str, str]:
    state = get_state()
    if state.stream_token:
        if x_quicknode_token != state.stream_token:
            raise HTTPException(status_code=401, detail="invalid stream token")
    # QuickNode posts the filter JSON with no Content-Type. FastAPI would
    # otherwise leave the body as a string and reject it with 422.
    raw = await request.body()
    try:
        parsed = json.loads(raw) if raw else {}
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid json") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="expected object")
    events = process_webhook_matches(parsed, state.book.seen)
    if events:
        background_tasks.add_task(_hedge_bought_events, events)
    return {"status": "accepted"}
