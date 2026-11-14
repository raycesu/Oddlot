# WS2 — Pricer + hedger

Python FastAPI service: Black–Scholes, Gemini crowd price, hedge book, QuickNode webhook.

## Run scaffold stub

```bash
cd pricer
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn oddlot_pricer.api.main:app --reload --port 8000
```

Frozen response shapes: `../schemas/api/`. Pydantic models: `oddlot_pricer/api/schemas.py`.

Pricing/hedging math starts at M2.
