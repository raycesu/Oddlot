# Oddlot — architecture plan

M0–M3 backend done. M4 web app (Buy / Protect / Vault) is implemented under `app/`.

Cursor rules (`.cursor/rules/`) are the agent entrypoint. The master PRD called this `AGENTS.md`; in this repo every `AGENTS.md` reference means Cursor rules.

**Full specs in-repo:**
- Master PRD → [`docs/master-prd.md`](./docs/master-prd.md)
- Hackathon guide → [`docs/hackathon-guide-ubc-2026.md`](./docs/hackathon-guide-ubc-2026.md)
- PDFs → [`docs/pdfs/`](./docs/pdfs/)

## Product in one line

Oddlot sells **SPY options in one-share lots**, fully backed by USDC on Solana, priced against Wall Street (Black–Scholes) and Gemini's S&P year-end prediction market.

## Hackathon positioning (UBC 2026)

- **Track:** DeFi and Onchain Applications
- **Chain award:** Best use of Solana
- **Bounties:** Gemini Prediction Markets, QuickNode Streams
- **Skip:** ElevenLabs, Grok Bot
- **Submit by:** Fri Nov 20, 10 AM CST (deadline noon CST)
- **Finals:** Sat Nov 21, UT Austin

## System architecture

The **on-chain program holds all funds and enforces solvency**. Off-chain services only price and hedge — their failure can cost LPs edge, never holders' payouts.

```text
┌─────────────┐     quote (15s)      ┌──────────────┐
│  WS2 Pricer │ ───────────────────► │  WS3 Keeper  │
│  + Hedger   │ ◄── Bought events ── │  + Stream    │
└──────▲──────┘    (QuickNode)       └──────┬───────┘
       │                                    │ post_quote / settle / exercise
       │ webhook                            ▼
       │                             ┌──────────────┐
┌──────┴──────┐   buy / deposit      │ WS1 Program  │
│  WS4 Web    │ ───────────────────► │  Vault+Series│
│  Buy/Protect│   read IDL state     │  Token-2022  │
│  /Vault     │ ◄─────────────────── │  Pyth/Demo   │
└─────────────┘                      └──────────────┘
```

### Five-step flow

1. **Quote** — Pricer computes BS + crowd; keeper posts quote every 15s
2. **Buy** — Program checks market open, fresh quote, caps; locks max payout; mints Token-2022
3. **Stream** — QuickNode delivers `Bought` to hedger webhook
4. **Hedge** — Every 100 tokens → one listed SPY spread; leftovers via Gemini (year-end) or SPYx delta
5. **Settle** — Keeper settles with Pyth (or demo oracle); auto-exercise via permanent delegate

## Repo layout (frozen)

```text
oddlot/
  .cursor/rules/     Cursor rules (was AGENTS.md in the PRD)
  PRD.md             Master product + technical spec
  PLAN.md            This architecture plan
  DECISIONS.md       Agent decision log
  config/            Shared config (oddlot.json, replay-shock.json)
  schemas/api/       Frozen HTTP response shapes for WS2
  programs/oddlot/   WS1 Anchor program (scaffold)
  tests/             WS1 program tests (scaffold)
  keeper/            WS3 TypeScript keeper + scripts (scaffold)
  pricer/            WS2 FastAPI pricer + hedger (scaffold)
  app/               WS4 Next.js web app (scaffold)
  .env.example
```

## Workstreams

| ID | Builds | Needs before start | Hands off |
|----|--------|--------------------|-----------|
| WS1 | Vault, series, buy, settle, auto-exercise | Shared config | IDL, program ID, devnet deploy |
| WS2 | Pricing, hedger, simulator, API | Config + API schemas + event layouts | `/quotes`, `/book`, `/distribution`, `/trades`, `/webhook/quicknode` |
| WS3 | Quote poster, settlement, replay, Stream, faucet | IDL + `/quotes` | On-chain quotes, settled series, seeded demo, live Stream |
| WS4 | Buy, Protect, Vault screens | IDL + API schemas | Working UI on Phantom/devnet |

## Milestones (gates)

| Gate | When | Done means |
|------|------|------------|
| M0 | Interfaces frozen | Config + Cursor rules + program/pricer scaffolds; schemas validate |
| M1 | Program | M1 acceptance tests pass; deployed to devnet |
| M2 | Pricer | M2 unit tests pass |
| M3 | Keeper + Stream + faucet | M3 integration tests pass |
| M4 | Web app | M4 tests pass; all P0 done |
| M5 | End-to-end | Demo checklist twice from `seed-demo` |
| Freeze | Thu Nov 19 noon | README, Devpost, video |
| Submit | Fri Nov 20 10 AM CST | Devpost live |

## P0 surface (do not implement in this scaffold pass)

- Anchor: vault, LP deposit/withdraw, series, quotes, buy, settle, exercise, collateral checks
- Token-2022 option mints (metadata + permanent delegate)
- Pyth SPY + market-hours guard; demo replay oracle
- Keeper loops + create-series / seed-demo / stream-setup
- Pricer BS + Gemini crowd + hedger round-lot netting
- QuickNode Stream → hedger webhook
- Web: Buy, Protect, Vault + test-USDC faucet

## Human setup still needed

- [ ] QuickNode Solana devnet endpoint + Streams API key
- [ ] Vercel + Railway/Render deploy tokens
- [ ] Devnet SOL for admin, keeper, LP, faucet, 5 demo buyers
- [ ] Phantom on devnet
- [ ] Re-confirm Pyth SPY feed ID in `config/oddlot.json`
- [ ] Gemini office hours: sandbox prediction-market orders?
