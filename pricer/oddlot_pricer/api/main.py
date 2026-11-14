"""FastAPI surface — scaffold stubs that return schema-valid empty payloads."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI

from oddlot_pricer.api.schemas import (
    BookResponse,
    DistributionResponse,
    QuotesResponse,
    TradesResponse,
)

app = FastAPI(title="Oddlot Pricer", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "oddlot-pricer", "mode": "scaffold"}


@app.get("/quotes", response_model=QuotesResponse)
def get_quotes() -> QuotesResponse:
    return QuotesResponse(
        asof=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        spot="0.00",
        quotes=[],
    )


@app.get("/book", response_model=BookResponse)
def get_book() -> BookResponse:
    return BookResponse(
        asof=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )


@app.get("/distribution", response_model=DistributionResponse)
def get_distribution() -> DistributionResponse:
    return DistributionResponse(
        event="SPXEND26",
        r="0.1000",
        coverage="0.00",
        buckets=[],
    )


@app.get("/trades", response_model=TradesResponse)
def get_trades() -> TradesResponse:
    return TradesResponse(trades=[])


@app.post("/webhook/quicknode")
def webhook_quicknode(payload: dict) -> dict[str, str]:
    _ = payload
    return {"status": "accepted", "mode": "scaffold"}
