# Oddlot

SPY options in **one-share lots**, fully backed by USDC on Solana, priced against Wall Street and Gemini's prediction market.

Built for **UBC 2026** — DeFi & Onchain Applications · Best use of Solana · Gemini Prediction Markets · QuickNode Streams.

> Listed options come in round lots of 100. Oddlot sells odd lots, then nets them back into round lots to hedge.

## Status

**M0 frozen. M1 program deployed to devnet. M2 pricer unit tests pass.** Shared config, API schemas, and the program IDL are the frozen contract. The program covers vault shares, series mints, buy, settle, and exercise. The pricer covers BS + Gemini crowd quotes, Bought decode, and round-lot netting.

## Repo map

| Path | Workstream |
|------|------------|
| `.cursor/rules/` | Agent rules (PRD called this `AGENTS.md`) |
| `PRD.md` / `PLAN.md` | Product + architecture |
| `config/` | Shared `oddlot.json` + demo replay |
| `schemas/api/` | Frozen WS2 HTTP shapes |
| `idl/oddlot.json` | Generated program IDL |
| `programs/oddlot/` | WS1 Anchor program |
| `keeper/` | WS3 keeper + scripts (stubs) |
| `pricer/` | WS2 FastAPI pricer + hedger |
| `app/` | WS4 Next.js scaffold |
| `DECISIONS.md` | Agent decision log |

## Quick links

- Architecture: [`PLAN.md`](./PLAN.md)
- **Full master PRD:** [`docs/master-prd.md`](./docs/master-prd.md)
- **Hackathon guide:** [`docs/hackathon-guide-ubc-2026.md`](./docs/hackathon-guide-ubc-2026.md)
- Doc index / PDFs: [`docs/README.md`](./docs/README.md)
- Spec index: [`PRD.md`](./PRD.md)
- GitHub: https://github.com/raycesu/Oddlot

## Local

```bash
# Pricer — M2 unit tests + local server
cd pricer && python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
OFFLINE_PRICER=1 uvicorn oddlot_pricer.api.main:app --reload --port 8000

# Program build + M1 acceptance tests (LiteSVM, no local validator)
cd ..
anchor build --arch v2
cp target/idl/oddlot.json idl/oddlot.json
cargo test -p oddlot

# Devnet deploy. The configured RPC returns HTTP 413 on this upload,
# so use the public devnet endpoint. Program rent is about 2.23 SOL.
set -a && source .env && set +a
solana program deploy target/deploy/oddlot.so \
  --program-id target/deploy/oddlot-keypair.json \
  --url https://api.devnet.solana.com \
  --keypair "$ADMIN_KEYPAIR"
```

Program id: `AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n`.

Deployed 2026-11-14. Signature `oiav8FAJbeNN9qDBqk4H3eUmkqYUNPZqYaYLBvnBeWixbqtxKA9quC6WBxyxVx5VPBCS2PKwZ4CzsZ2Yw3AhQpN`. The account is executable.

## Human setup checklist

See `PLAN.md` — QuickNode, hosting, keypairs, Phantom, Pyth feed confirm, Gemini sandbox.
