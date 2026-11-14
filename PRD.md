# Master PRD: Oddlot — SPY options in one-share lots

> Agents: read `.cursor/rules/` first (this replaces the PRD's `AGENTS.md`), then this file. Spec sections below win over narrative.

## Summary

Oddlot sells options on SPY in one-share sizes, fully backed by USDC on Solana, priced against Wall Street and Gemini's prediction market.

**Pitch:** listed options only come in round lots of 100 shares. We sell them in odd lots, then net odd lots back into round lots to hedge.

### Final decisions

- **Underlying:** SPY only for the hackathon (series already carry an `underlying` field for later tickers)
- **Payoffs:** capped call/put spreads — max payout locked in USDC at mint
- **Calls and puts** from day one; puts carry the lead story (protect exactly 44 shares)
- **Gemini is core** for year-end series pricing and residual hedges
- **Devnet + team-minted test USDC only** (Circle faucet is too small to fund the vault)

### Users

| User | Need | Screen |
|------|------|--------|
| Wealth advisor | Protect exact S&P exposure (e.g. 44 shares) | Protect (puts) |
| Retail investor | S&P upside for $10–$50 | Buy (calls) |
| Liquidity provider | Earn premium on USDC with capped, fully backed risk | Vault |

## MVP scope

- One underlying (SPY), European exercise, cash-settled in 6-decimal test USDC
- **Year-end series:** expire `2026-12-31T21:00:00Z` (4 PM ET), strikes every $20 near spot, widths $20 or $40
- **Demo series:** expire minutes after creation on a replay oracle for live settlement demos

### Priority

| Priority | Ships |
|----------|--------|
| P0 (by Nov 17) | Program, Token-2022, Pyth + demo oracle, keeper, pricer, QuickNode Stream, hedger, web Buy/Protect/Vault, faucet |
| P1 (Nov 18–19) | Gemini bucket hedge, crowd vs Wall Street chart, LP P&L simulation, Postgres trade tape |
| P2 | Fed-decision chip, on-chain delta hedges, more tickers |

**Out of scope:** uncapped payoffs, American exercise, mainnet, KYC, real listed-option trades.

## Architecture

Program holds funds and enforces solvency. Off-chain only prices and hedges.

1. Quote → 2. Buy → 3. Stream → 4. Hedge → 5. Settle (see `PLAN.md`)

## Tech stack

| Layer | Built on |
|-------|----------|
| Program | Rust + Anchor (devnet); Token-2022 via Anchor SPL token-interface; Pyth Solana receiver |
| Program tests | Anchor test runner / local validator (TypeScript) |
| Keeper | TypeScript/Node; Anchor TS client from IDL; Pyth Hermes + receiver SDK |
| Pricer / hedger | Python 3.12, FastAPI, numpy/scipy, yfinance, httpx, SQLite (Postgres in P1) |
| Web | Next.js App Router, TypeScript, Tailwind, shadcn/ui, Solana wallet adapter, Recharts |
| Hosting | Vercel (web); Railway/Render (pricer + keeper) |
| RPC | QuickNode Solana devnet |

## Shared config

Authoritative defaults live in `config/oddlot.json`. The vault account stores its own copies of vault limits at `init_vault`; the program never reads the JSON file at runtime.

## Program spec (WS1) — interface freeze

Money and prices are `u64` in USD × 10^6. Times are `i64` Unix seconds. Option mints have **0 decimals** (1 token = 1 share). No floating point on-chain.

### Accounts

- `Vault` — PDA `["vault"]`: admin, keeper, usdc_mint, usdc_vault, lp_mint, total_locked, limits, paused, bump
- `Series` — PDA `["series", vault, underlying, [kind], strike_le, width_le, expiry_le]`
- `DemoOracle` — PDA `["demo_oracle", vault]`

### Instructions

`init_vault`, `deposit`, `withdraw`, `create_series`, `post_quote`, `set_demo_price`, `buy`, `settle`, `exercise`, `set_paused`

### Payoff

- Call: `min(max(S − K, 0), W)`
- Put: `min(max(K − S, 0), W)`

### Events

`Deposited`, `Withdrawn`, `Quoted`, `Bought`, `Settled`, `Exercised` via `emit!` (not `emit_cpi!`). Layouts for WS2 hand-decoding are in the master Fractional Options PDF / acceptance section.

### Invariant

`vault USDC balance ≥ total_locked = Σ unsettled (OI × width) + Σ settled (OI × payoff)`

## Pricing and hedging spec (WS2) — interface freeze

Endpoints (money as decimal USD strings; times ISO 8601 UTC):

- `GET /quotes`
- `GET /book`
- `GET /distribution`
- `GET /trades`
- `POST /webhook/quicknode`
- `GET /simulation` (P1)

Quote: `premium = max(min_premium, ceil_cent((1 + spread) × max(BS, crowd)))` with unavailable crowd treated as 0.

Hedger: rebuild OI from Series accounts on startup; on each `Bought`, print listed lots at 100 tokens; residual year-end → Gemini buckets; else → SPYx delta.

Frozen JSON schemas: `schemas/api/`.

## Keeper and Stream spec (WS3) — interface freeze

Loops: quote poster (`quote_interval_s`), settlement (`settle_poll_s`), replay driver.

Scripts: `create-series`, `seed-demo`, `stream-setup`.

Also: `POST /faucet {wallet}` — 1,000 test USDC + 0.05 SOL, once per wallet per hour.

QuickNode: Solana devnet → webhook `https://<pricer>/webhook/quicknode`.

## Web app spec (WS4) — interface freeze

Screens: **Buy**, **Protect**, **Vault**. Header: Oddlot, Devnet badge, wallet, market-status chip.

On-chain premium is the price users pay; pricer numbers are display-only. Poll `/book`, `/distribution`, `/trades` every 5s.

## Acceptance tests & milestones

See Fractional Options master PRD pages on acceptance tests (reference BS numbers, Gemini toy event, M1–M5 checklists) and milestone gates in `PLAN.md`.

## Submission deliverables

Public GitHub, working demo, 2–3 min video, README covering economic design, Solana usage, addresses, Gemini usage, QuickNode Stream config, and local run commands.
