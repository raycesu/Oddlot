# WS2 — Pricer + hedger

Python FastAPI service: Black–Scholes, Gemini crowd price, hedge book, QuickNode webhook.

## M2 gate

```bash
cd pricer
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

All M2 acceptance tests must pass (BS + crowd reference numbers, label parse, Bought decode/dedupe, round-lot netting, schema validation).

## Run locally

```bash
uvicorn oddlot_pricer.api.main:app --reload --port 8000
```

For live year-end spot, set `PYTH_API_KEY` (Hermes Bearer) so `fetch_spot` can read Equity.US.VOO/USD. Without it, spot falls back to `$780`.

Set `OFFLINE_PRICER=1` to use the PRD toy Gemini book and spot `$780` without live Hermes/yfinance/Gemini calls.

Frozen response shapes: `../schemas/api/`. Pydantic models: `oddlot_pricer/api/schemas.py`.
