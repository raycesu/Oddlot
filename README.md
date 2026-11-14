# Oddlot

SPY options in **one-share lots**, fully backed by USDC on Solana, priced against Wall Street and Gemini's prediction market.

Built for **UBC 2026** — DeFi & Onchain Applications · Best use of Solana · Gemini Prediction Markets · QuickNode Streams.

> Listed options come in round lots of 100. Oddlot sells odd lots, then nets them back into round lots to hedge.

## Status

**Scaffold / M0 in progress.** Repo layout, Cursor rules, shared config, frozen API schemas, and program/pricer/keeper/app stubs are in place. Business logic is not implemented yet.

## Repo map

| Path | Workstream |
|------|------------|
| `.cursor/rules/` | Agent rules (PRD called this `AGENTS.md`) |
| `PRD.md` / `PLAN.md` | Product + architecture |
| `config/` | Shared `oddlot.json` + demo replay |
| `schemas/api/` | Frozen WS2 HTTP shapes |
| `idl/oddlot.json` | Generated program IDL (stub accounts until M1) |
| `programs/oddlot/` | WS1 Anchor program (stubs) |
| `keeper/` | WS3 keeper + scripts (stubs) |
| `pricer/` | WS2 FastAPI stub |
| `app/` | WS4 Next.js scaffold |
| `DECISIONS.md` | Agent decision log |

## Quick links

- Architecture: [`PLAN.md`](./PLAN.md)
- Spec: [`PRD.md`](./PRD.md)
- GitHub: https://github.com/raycesu/Oddlot

## Local (scaffold)

```bash
# Program (emits IDL once build deps resolve)
anchor build

# Pricer stub
cd pricer && python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn oddlot_pricer.api.main:app --reload --port 8000
```

## Human setup checklist

See `PLAN.md` — QuickNode, hosting, keypairs, Phantom, Pyth feed confirm, Gemini sandbox.
