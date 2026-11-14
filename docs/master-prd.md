# Master PRD: Oddlot — SPY options in one-share lots

> Canonical product + technical spec for coding agents.
> In this repo, the PRD's `AGENTS.md` is replaced by `.cursor/rules/`.
> Spec sections (Program through Web app, Acceptance tests, Milestones) win over narrative.
> If two spec sections conflict, stop and ask.
>
> Sources: `docs/pdfs/Fractional_Options.pdf` (pages 1–5 short overview + pages 6–24 master).
> Page-faithful cleaned extract: `docs/source/fractional-options-pdf-extract.md`.

---

## How to use this PRD

This is the master spec for the coding agents that build Oddlot. Humans can stop after MVP scope; agents read everything.

### Rules for agents

1. **Source of truth.** Spec sections win over narrative. If two spec sections conflict, stop and ask.
2. **Decide, log, continue.** When something is unspecified, pick the simplest option consistent with this PRD. Record it in `DECISIONS.md` (date, decision, reason, workstream) and keep going.
3. **Scope.** Build P0, then P1, in MVP order. Add nothing else: no extra tickers, features, chains, or mainnet.
4. **Tests define done.** Write each milestone's acceptance tests first. A milestone is done only when they pass in CI or a recorded local run.
5. **Frozen interfaces.** Shared config, program accounts/instructions/events, and API schemas are frozen after M0. To change one, update this spec, every consumer, and `DECISIONS.md` in the same change.
6. **Check live docs.** Use the latest stable Anchor, Pyth, QuickNode, and Gemini APIs. Read current docs before coding against them.
7. **Never:** commit keypairs, API keys, or `.env` files; touch mainnet or real funds; use floating-point math on-chain; weaken a program check to make a test pass.
8. **Stop and ask a human** when you need an account, API key, captcha, or faucet; a frozen interface must change; an acceptance test cannot pass as written; or anything would cost real money.
9. **Keep it runnable.** At every milestone, `README.md` has working commands to build, test, and run each part locally.

---

## Part A — Short overview (team)

### Summary

Oddlot sells options on SPY in one-share sizes, fully backed by USDC on Solana, and priced against both Wall Street and Gemini's prediction market.

We enter the **DeFi and Onchain Applications** track with **Best use of Solana**, plus the **Gemini Prediction Markets** and **QuickNode Streams** bounties.

**Pitch:** listed options only come in round lots of 100 shares. We sell them in odd lots, then net the odd lots back into round lots to hedge.

### Key decisions

- **SPY only for now.** Fits every prize: Gemini lists S&P markets (not single stocks); SPY has SPYx and a Pyth feed; listed options are most liquid to net into. Program supports more tickers later without changes.
- **Capped payoffs.** Every token is a call or put spread; max payout locked in USDC at mint. Holders never depend on the hedger.
- **Calls and puts from day one.** Puts carry the lead story: an advisor protects exactly 44 shares.
- **Gemini is core.** Its S&P year-end market prices and hedges our year-end series.

Built for UBC 2026. Submission due **Friday, Nov 20 at noon CST**; finals **Saturday, Nov 21** at UT Austin. Internal submit target: **10 AM CST** (two hours early).

### Problem and users

Listed options trade in 100-share contracts. Illustrative 30-day ATM calls at 16% vol, SPY near $780:

| Contract | Exposure | Approx. premium |
|----------|----------|-----------------|
| SPX index option | 100 × index (~$780,000) | ~$14,300 |
| SPY option | 100 shares (~$78,000) | ~$1,430 |
| Oddlot token | 1 SPY share (~$780) | ~$14 |

A client with ~$34,000 in an S&P fund holds ~44 SPY-equivalent shares; listed puts protect 0 or 100. Mini options failed for volume — the fix is aggregation.

| User | Need | Screen |
|------|------|--------|
| Wealth advisor (lead story) | Protect exact S&P exposure, e.g. 44 shares | Protect (puts) |
| Retail investor | S&P upside for $10–$50 | Buy (calls) |
| Liquidity provider | Earn premium on USDC with capped, fully backed risk | Vault |

### Prize strategy

If everything lands, prizes stack to **$9,000**.

| Entry | Prize | How we qualify |
|-------|-------|----------------|
| DeFi and Onchain Applications | $2,000 | Fractional fully backed options + Pyth + Token-2022 + Gemini + live solvency dashboard |
| Best use of Solana | $1,500 | Anchor, Token-2022 extensions, Pyth pull oracle |
| Gemini Prediction Markets | $2,500 / $1,000 / $500 | S&P year-end market prices and hedges year-end series |
| QuickNode Streams | $500 | Stream on our program feeds the hedger |
| Official overall winner | $2,500 / $1,000 / $500 | Automatic with complete submission |

Skip ElevenLabs and Grok Bot.

### What makes it win

| Feature | What it does | Wins |
|---------|--------------|------|
| Odd lots in, round lots out | Hedger nets small trades; every 100 tokens → one listed SPY spread; live meter | DeFi, overall |
| Crowd-priced, crowd-hedged | Gemini buckets → option price; quote max(BS, crowd); hedge leftovers with buckets | Gemini |
| Backed by construction | Lock max payout at mint; reject unsafe buys; solvency panel ≥ 100% | DeFi |
| Market-hours guard + auto-exercise | No sales when market closed; Token-2022 permanent delegate pays holders | Solana |
| Protect exactly | Advisor buys exact put quantity in one tx | UX / impact |

### MVP scope

SPY only; calls and puts as capped spreads; cash-settled in team-minted test USDC (Circle faucet too small).

- **Year-end series:** expires Dec 31, 2026 at 4 PM ET (`2026-12-31T21:00:00Z`), same moment as Gemini S&P year-end. Strikes every $20 near spot; widths $20 or $40.
- **Demo series:** expires minutes after creation on a replay price feed for live settlement.

| Priority | What ships |
|----------|------------|
| **P0** by Nov 17 | Anchor program; Token-2022; Pyth + market-hours; keeper; pricer (BS + Gemini); QuickNode Stream; hedger; web Buy/Protect/Vault; test-USDC faucet |
| **P1** Nov 18–19 | Gemini bucket hedge; crowd vs Wall Street chart; LP P&L simulation; Postgres trade tape |
| **P2** next | Fed-decision chip; on-chain delta hedges; more tickers |

**Cut order if behind:** P2 → P1 charts → Gemini hedge. **Never cut:** collateral checks, auto-exercise, Protect screen.

### Architecture (summary)

The program holds all funds and enforces solvency. Off-chain only prices and hedges — off-chain failure can cost LPs edge, never holders' payouts.

1. **Quote** — pricer computes BS + crowd; keeper posts quote every 15s
2. **Buy** — program checks market open, fresh quote, limits; takes premium; locks max payout; mints tokens
3. **Stream** — QuickNode delivers trade event to hedger
4. **Hedge** — every 100 tokens → one listed SPY spread; leftovers: Gemini (year-end) or SPYx (others)
5. **Settle** — keeper settles with Pyth; pays every holder; unused collateral returns to vault

### Workstreams

| WS | Builds | Stack |
|----|--------|-------|
| WS1 Program | Vault, series, buy, settle, auto-exercise | Rust + Anchor, Token-2022, Pyth |
| WS2 Pricer | BS + crowd pricing, hedger, API | Python, FastAPI |
| WS3 Keeper | Quotes, settlement, demo scripts, Stream, faucet | TypeScript, Node |
| WS4 Web app | Buy, Protect, Vault | Next.js, wallet adapter |

### Demo success criteria

Judge sees: advisor protect exactly 44 shares → vault nets into a round lot → every holder paid at expiry → coverage never below 100%.

### Economics (short)

Holders: no counterparty risk (max payout locked at mint). LPs: market risk; vault prices conservatively and hedges down.

Quote = higher of BS (listed SPY IV) and Gemini crowd price, plus 3% spread. A capped spread is a strip of Gemini buckets; crowd uses asks so buying that strip never costs more than premium collected (within midpoint error).

---

## Part B — Master build spec

### Final decisions for the build

- Underlying is **SPY**
- Payoffs are **capped spreads**
- **Calls and puts** from day one
- **Gemini is core**, not a stretch
- Devnet + test USDC only

### Prize submission must-haves

| Entry | Must be in the submission |
|-------|---------------------------|
| DeFi track | README on economic design and risk; every program/account address |
| Best use of Solana | Program ID; README section on how we use Solana |
| Gemini | Uses Prediction Markets API |
| QuickNode Streams | One Stream with filter + destination; README on network, dataset, filter, destination, why |

### MVP item × priority × workstream

| Item | Priority | Workstream |
|------|----------|------------|
| Anchor program: vault, LP deposit/withdraw, series, quotes, buy, settle, exercise, collateral checks | P0 | WS1 |
| Token-2022 option mints with metadata and permanent delegate | P0 | WS1 |
| Pyth SPY oracle with market-hours guard; replay oracle for demo | P0 | WS1, WS3 (replay driver) |
| Keeper: post quotes, settle, auto-exercise, series and seed scripts | P0 | WS3 |
| Pricer: BS from listed SPY IV, Gemini crowd, `/quotes` API | P0 | WS2 |
| QuickNode Stream → hedger webhook | P0 | WS3 Stream, WS2 handler |
| Hedger: round-lot netting and residual hedges, paper fills | P0 | WS2 |
| Web app: Buy, Protect, Vault | P0 | WS4 |
| Gemini bucket hedge (sandbox or paper at live asks) | P1 | WS2 |
| Crowd vs Wall Street chart | P1 | WS4 + WS2 data |
| LP P&L simulation chart (four hedge strategies) | P1 | WS2 + WS4 |
| Second Stream destination: Postgres trade tape | P1 | WS3 |
| Fed-decision chip (Gemini December Fed market) | P2 | WS2, WS4 |
| Delta hedges as devnet swaps vs mock SPYx pool | P2 | WS1, WS3 |
| More underlyings (NVDA, META via xStocks + Pyth) | P2 | All |

**Out of scope:** uncapped payoffs, American exercise, mainnet, KYC, real trades in listed options.

---

## Tech stack and repo layout

| Layer | Built on |
|-------|----------|
| Program | Rust + Anchor on Solana devnet; Anchor SPL token-interface for Token-2022; Pyth Solana receiver |
| Program tests | Anchor test runner / local validator (TypeScript) |
| Keeper + scripts | TypeScript on Node; Anchor TS client from IDL; Pyth Hermes + receiver SDK |
| Pricer + hedger | Python 3.12, FastAPI, numpy/scipy, yfinance, httpx, SQLite (Postgres in P1) |
| Web app | Next.js App Router, TypeScript, Tailwind, shadcn/ui, Solana wallet adapter (Phantom), Recharts |
| Hosting | Vercel (web); Railway or Render (pricer + keeper) |
| RPC | QuickNode Solana devnet |

```text
oddlot/
  .cursor/rules/     # was AGENTS.md in the PDF
  PRD.md             # index → this file
  docs/master-prd.md # THIS FILE (canonical)
  DECISIONS.md
  config/oddlot.json
  programs/oddlot/   # WS1
  tests/             # WS1
  keeper/            # WS3
  pricer/            # WS2
  app/               # WS4
  schemas/api/       # frozen HTTP schemas
  .env.example
```

### Workstream handoffs

| WS | Needs before starting | Hands off |
|----|----------------------|-----------|
| WS1 | Shared config | IDL, program ID, devnet deploy |
| WS2 | Config, API schemas, event layouts | `/quotes`, `/book`, `/distribution`, `/trades`, `/webhook/quicknode` |
| WS3 | IDL, `/quotes` | On-chain quotes, settled series, seeded demo, live Stream |
| WS4 | IDL, API schemas | Buy, Protect, Vault screens |

**M0 freezes:** `config/oddlot.json`, program skeleton matching Program spec (IDL), pricer stub returning schema-valid JSON.

---

## Shared config (`config/oddlot.json`)

Defaults (dollars unless named otherwise). Vault account stores its own copies of vault limits at init; **program never reads this file at runtime**.

```json
{
  "cluster": "devnet",
  "underlying": "SPY",
  "pyth_feed_id": "<Equity.US.SPY/USD id from Pyth>",
  "usdc_mint": "<team test-USDC mint, 6 decimals>",
  "vault": {
    "max_util_bps": 8000,
    "quote_max_age_s": 60,
    "oracle_max_age_s": 60,
    "settle_window_s": 900,
    "max_conf_bps": 50
  },
  "year_end": {
    "expiry": "2026-12-31T21:00:00Z",
    "strike_step": 20,
    "strike_band_pct": 8,
    "widths": [20, 40],
    "kinds": ["call", "put"],
    "max_open_interest": 500,
    "buy_cutoff_s": 600
  },
  "demo": {
    "expiry_after_s": 480,
    "buy_cutoff_s": 30,
    "widths": [20, 40],
    "max_open_interest": 2000,
    "sigma": 0.16,
    "replay_file": "config/replay-shock.json"
  },
  "pricing": {
    "spread": 0.03,
    "min_premium": 0.05,
    "rate": 0.0,
    "crowd_min_coverage": 0.8,
    "gemini_base": "https://api.gemini.com",
    "gemini_event": "SPXEND26",
    "spx_ratio_fallback": 0.1
  },
  "hedging": {
    "round_lot": 100,
    "delta_band_shares": 5,
    "rehedge_interval_s": 60,
    "spyx_cost_bps": 2
  },
  "keeper": {
    "quote_interval_s": 15,
    "settle_poll_s": 60,
    "exercise_batch": 5
  }
}
```

---

## Program spec (WS1)

One Anchor program `oddlot` on devnet. Money/prices are `u64` in **USD × 10^6** ($780 = `780_000_000`). Times are `i64` Unix seconds. Option mints have **0 decimals** (1 token = 1 share). No floating point on-chain; use `u128` intermediates and checked math.

### Accounts

```rust
#[account]
pub struct Vault {
    pub admin: Pubkey,
    pub keeper: Pubkey,
    pub usdc_mint: Pubkey,
    pub usdc_vault: Pubkey,       // PDA ["usdc_vault", vault]
    pub lp_mint: Pubkey,          // SPL Token, 6 decimals, authority = vault PDA
    pub total_locked: u64,
    pub max_util_bps: u16,
    pub quote_max_age_s: u32,
    pub oracle_max_age_s: u32,
    pub settle_window_s: u32,
    pub max_conf_bps: u16,
    pub paused: bool,
    pub bump: u8,
}

#[account]
pub struct Series {
    pub vault: Pubkey,
    pub underlying: [u8; 8],      // ASCII zero-padded: b"SPY\0\0\0\0\0"
    pub kind: u8,                 // 0 = call, 1 = put
    pub strike: u64,
    pub width: u64,
    pub expiry: i64,
    pub buy_cutoff_s: u32,
    pub oracle_kind: u8,          // 0 = Pyth, 1 = Demo
    pub pyth_feed_id: [u8; 32],
    pub option_mint: Pubkey,      // Token-2022 PDA ["mint", series]
    pub premium: u64,
    pub bs_premium: u64,
    pub crowd_premium: u64,       // 0 = not available
    pub quote_ts: i64,
    pub open_interest: u64,
    pub max_open_interest: u64,
    pub settle_price: u64,
    pub payoff_per_token: u64,
    pub settled: bool,
    pub bump: u8,
}

#[account]
pub struct DemoOracle {
    pub price: u64,
    pub ts: i64,
    pub bump: u8,
} // PDA ["demo_oracle", vault]
```

- Vault PDA: `["vault"]`
- Series PDA: `["series", vault, underlying, [kind], strike_le, width_le, expiry_le]`

### Instructions

| Instruction | Signer | Checks | Effects |
|-------------|--------|--------|---------|
| `init_vault(keeper, limits)` | Admin | Once only | Creates Vault, LP mint, USDC vault, DemoOracle; stores limits |
| `deposit(amount)` | LP | amount > 0 | Shares = amount if supply 0 else floor(amount × supply ÷ USDC balance); mint shares |
| `withdraw(shares)` | LP | payout ≤ balance − total_locked else `InsufficientFreeLiquidity` | Burn shares, send USDC |
| `create_series(...)` | Admin | width > 0; expiry > now + buy_cutoff; puts: width ≤ strike | Series + Token-2022 mint (0 decimals, metadata, permanent delegate = series PDA) |
| `post_quote(premium, bs, crowd)` | Keeper | Not settled; premium > 0 | Store quote + ts; emit `Quoted` |
| `set_demo_price(price)` | Keeper | price > 0 | DemoOracle price/ts = now |
| `buy(qty, max_cost)` | Buyer | See buy checks below | Take premium; lock qty×width; mint; emit `Bought` |
| `settle` | Anyone | now ≥ expiry; not settled; oracle in settle window | Store settle_price + payoff; unlock unused; emit `Settled` |
| `exercise` | Anyone | Settled; correct mint; USDC dest same owner | Burn via permanent delegate; pay balance×payoff; emit `Exercised` |
| `set_paused(paused)` | Admin | — | Set paused |

**Buy checks (in order):** not Paused; qty > 0; now < expiry − buy_cutoff_s; quote age ≤ quote_max_age_s; oracle checks; OI + qty ≤ max; cost = qty × premium ≤ max_cost; `(total_locked + qty × width) × 10000 ≤ (USDC balance + cost) × max_util_bps`.

**Payoff per token** (S = settle price):

- call = `min(max(S − K, 0), W)`
- put = `min(max(K − S, 0), W)`

**Oracle checks (Pyth):** PriceUpdateV2 owned by Pyth receiver; feed ID match; `now − publish_time ≤ oracle_max_age_s` (MarketClosed); `conf × 10000 ≤ max_conf_bps × price`; price > 0. Demo series use DemoOracle with same age check.

**Pyth → USD×10^6:** multiply by 10^(expo+6) when expo ≥ −6, else divide by 10^(−6−expo), round down.

**Invariant (tested after every instruction):**

`vault USDC ≥ total_locked = Σ unsettled (OI × width) + Σ settled (OI × payoff)`

Rounding always favors the vault.

### Events

Emit with `emit!` (not `emit_cpi!`). Discriminator = first 8 bytes of `sha256("event:<Name>")`, then fields LE.

```rust
Deposited { lp, amount, shares, ts }
Withdrawn { lp, amount, shares, ts }
Quoted    { series, premium, bs_premium, crowd_premium, ts }
Bought    { buyer, series, qty, cost, spot, ts }
Settled   { series, price, payoff_per_token, ts }
Exercised { holder, series, qty, paid, ts }
```

`Bought` unpack (after discriminator): `struct.unpack("<32s32sQQQq", raw[8:104])`.

### Error codes

`Paused`, `ZeroQuantity`, `BuyWindowClosed`, `QuoteStale`, `MarketClosed`, `OracleConfidence`, `InvalidOracle`, `OpenInterestCap`, `SlippageExceeded`, `UtilizationCap`, `InsufficientFreeLiquidity`, `NotExpired`, `AlreadySettled`, `NotSettled`, `SettlePriceOutOfWindow`, `InvalidSeriesParams`, `WrongMint`, `Unauthorized`, `MathOverflow`.

### Security checklist

- [ ] Admin/keeper instructions check signer via `has_one` against vault
- [ ] Every PDA derived from seeds + stored bump; no trust-by-address
- [ ] Token accounts checked for mint, owner, token program (SPL for USDC, Token-2022 for options)
- [ ] Pyth account owner + feed ID; demo cannot read Pyth and reverse
- [ ] Checked arithmetic with u128 intermediates
- [ ] `exercise` burns before it pays; settle/exercise cannot double-pay
- [ ] No instruction lets anyone but the program move vault USDC

---

## Pricing and hedging spec (WS2)

One FastAPI service. Use Python `Decimal` for money; floats only inside option math.

### Inputs

| Input | Source | Refresh |
|-------|--------|---------|
| Spot S | Pyth Hermes SPY; DemoOracle for demo | 5 s |
| IV per strike | yfinance SPY chain for expiry; linear interp; ATM for missing; demo uses `demo.sigma` | 5 min |
| SPY→SPX ratio r | prev close SPY ÷ prev close ^GSPC; fallback 0.1 | Daily |
| Gemini buckets | `GET {gemini_base}/v1/prediction-markets/events/{gemini_event}` (public) | 15 s |

### Black–Scholes

`T = (expiry − now) / (365 × 86400)`, rate 0, no dividends. Each leg uses its strike's vol. At T ≤ 0 use intrinsic.

- call spread = `C(K, σ_K) − C(K+W, σ_{K+W})`
- put spread = `P(K, σ_K) − P(K−W, σ_{K−W})`

### Gemini crowd price (year-end only)

1. Parse labels: `"A to B"` midpoint `(A+B+0.01)/2`; `"A or below"` / `"A or above"` use A. Strip commas.
2. `prices.bestBid` / `bestAsk` are strings in [0,1]; each contract pays $1.
3. Coverage = Σ mids of two-sided buckets ÷ Σ estimates of all buckets. Below `crowd_min_coverage` → crowd unavailable.
4. Crowd = Σ ask × payoff(r × midpoint). If any positive-payoff bucket has no ask → unavailable.
5. Display prob = estimate ÷ Σ estimates.

### Quote

`premium = max(min_premium, round_up_cent((1 + spread) × max(BS, crowd)))` with unavailable crowd as 0.  
`source = "crowd"` when crowd > BS else `"bs"`.

### Hedger

On startup rebuild OI from every Series account over RPC. On each `Bought`:

1. **Round lots:** residual = OI − 100 × lots_hedged. While residual ≥ 100, buy one listed spread (calls: long K short K+W; puts: long K short K−W). Paper-fill at listed mid or BS. Log "lot printed".
2. **Odd remainder, year-end + crowd:** target per bucket = residual × payoff(r × midpoint), round up; trade diff at ask/bid.
3. **Odd remainder, other series:** SPYx delta hedge. Call spread delta `N(d1(K))−N(d1(K+W))`; put spread `N(d1(K))−N(d1(K−W))` (negative). Rehedge every `rehedge_interval_s` or when gap > `delta_band_shares`. Fill at spot ± `spyx_cost_bps`.
4. **Settlement:** hedges pay their own payoffs; P&L = premiums − payouts + hedge P&L.

### Simulator (P1)

1,000 GBM paths at 16% vol to year-end; 20 trades/day size U(1,50), 60% calls. Compare: no hedge, delta only, round lots+delta, round lots+Gemini. `GET /simulation`.

### API schemas

All money = decimal USD strings; times = ISO 8601 UTC. Frozen JSON Schema: `schemas/api/`.

- `GET /quotes` — asof, spot, quotes[]
- `GET /book` — series residuals, listed_spreads, gemini, spyx_shares, pnl
- `GET /distribution` — event, r, coverage, buckets with crowd_prob/bs_prob
- `GET /trades` — recent trades
- `POST /webhook/quicknode` — Stream matches; verify token; decode events; 200 within 1s; hedge after reply

---

## Keeper and Stream spec (WS3)

One Node process, three loops + scripts. Safe to re-run; JSON logs to stdout.

### Loops

1. **Quote poster** every `quote_interval_s`: `GET /quotes`; `post_quote` when premium changed or on-chain quote > 30s old; batch up to 5; if `/quotes` fails, post nothing (safe → QuoteStale).
2. **Settlement** every `settle_poll_s`: for expired unsettled series, settle (Pyth: Hermes update in same tx; demo: settle direct); then `getProgramAccounts` Token-2022 by mint; `exercise` in batches of `exercise_batch` until OI = 0.
3. **Replay driver:** read `config/replay-shock.json`; `set_demo_price` every 5s linear interp from demo creation until all demo series settled.

### Scripts

- `create-series` — year-end grid from Pyth spot × config
- `seed-demo` — see Demo seeding
- `stream-setup` — QuickNode Streams REST API; print config for README

### QuickNode Stream

- Network: Solana **devnet**
- Dataset: block dataset with txs + logs (confirm name in current docs)
- Start: chain tip
- Destination: webhook `https://<pricer host>/webhook/quicknode`
- P1: add Postgres as second destination

Filter sketch (confirm field names with test-filter endpoint): match program ID; collect `Program data: ` log lines; return `{ matches: [{ signature, slot, blockTime, events }] }`.

### Test-USDC faucet

`POST /faucet {wallet}` — mint 1,000 test USDC + 0.05 SOL; at most once per wallet per hour.

---

## Web app spec (WS4)

Three screens; on-chain premium is what users pay; pricer numbers are display-only. Read series/vault via Anchor client; poll `/book`, `/distribution`, `/trades` every 5s.

**Header:** Oddlot, Devnet badge, wallet, market-status chip (open / closed · reopens 9:30 AM ET from Pyth age).

| Screen | Behavior |
|--------|----------|
| **Buy** | Year-end/demo picker; call strike chips; price card; BS vs crowd; qty stepper; buy with fresh Pyth update; max_cost = cost × 1.01; toast + explorer; user tokens list |
| **Protect** | Hold dollars or shares → floor shares; put strike + width; "Protects N shares from $A to $B"; comparison to listed 0/100; one Buy |
| **Vault** | Solvency (held, total_locked, coverage ≥ 100%); LP deposit/withdraw; netting meter; crowd vs WS chart (P1); trade tape; LP P&L sim (P1) |

**States:** wallet disconnected; no test USDC (faucet button); market closed; loading skeletons.

**Error map:** MarketClosed, QuoteStale, SlippageExceeded, OpenInterestCap, UtilizationCap, BuyWindowClosed, Paused → plain messages per PRD.

**Formatting:** dollars 2 dp + thousands; shares whole; times ET; series like `SPY Dec 31 $780/$740 put`.

---

## Demo and success criteria

- [ ] Protect: 44 put tokens year-end in one tx; tokens in wallet
- [ ] Buy: 1 call under $20 with BS + crowd shown
- [ ] Netting: meter fills; at 100 shares book shows one listed contract
- [ ] Settlement: demo series auto-exercises; USDC without clicks
- [ ] Shock: replay −8%; puts paid in full; coverage ≥ 100%
- [ ] Guard: outside hours year-end refuses sales
- [ ] README: economics, addresses, Solana, Stream, Gemini
- [ ] 2–3 min video (weekday, live Pyth)
- [ ] 5-min pitch + 2-min Q&A rehearsed

### Pitch outline (5 minutes)

1. Problem: 44 shares; listed puts 0 or 100 (0:30)
2. Live Protect (1:00)
3. Odd lots → round lots meter (0:45)
4. Crowd vs Wall Street + Gemini hedge (1:00)
5. Saturday guard, then demo shock settlement (1:00)
6. Backed by construction + next (0:45)

### Demo seeding (`seed-demo`)

Run ~3 minutes before stage (`expiry_after_s` 480 → settlement ~4 min into pitch).

1. Init vault if missing; mint 50,000 test USDC; deposit
2. Create year-end grid if missing
3. Two demo series on replay oracle at spot rounded to $20: call W=$20, put W=$40
4. Simulated buyers: 5 wallets buy target put sizes 5–20 every 10s until OI=56; live Protect 44 tips to 100. Also ~30 calls for tape. `--target year-end` for weekday video; `--target demo` for Saturday finals
5. Start replay driver

`config/replay-shock.json`:

```json
[
  { "t": 0, "x": 1.00 },
  { "t": 240, "x": 1.00 },
  { "t": 300, "x": 0.92 },
  { "t": 600, "x": 0.92 }
]
```

At spot $780 → $717.60; $780/$740 put pays full $40; call pays 0; coverage ≥ 100%.

---

## Economic design and risks

### Pricing

Quote = `1.03 × max(BS, crowd)`. Crowd (year-end): `Σ ask_i · payoff(r · m_i)`.

### Why crowd hedge works

Capped spread ≈ strip of buckets. Hold `residual × payoff(r·m)` of each bucket. Crowd priced at asks ⇒ strip cost ≤ premium collected (within midpoint error).

### Assumptions

Listed IV fair; hedge costs < 3% spread; SPY tracks SPX/10 over ~7 weeks; hedge fills are paper in prototype.

### Risk mitigation

| Risk | Mitigation |
|------|------------|
| Thin Gemini books | Price at asks; fall back to BS under 80% two-sided coverage; cap year-end OI at 500 |
| 24/7 tokens vs market hours | Market-hours guard on stale Pyth |
| Oracle issues | Age checks; settle window 15 min after expiry |
| Large move | Loss capped at locked collateral; 80% util; hedges |
| Keeper/hedger down | Funds stay in program; anyone can settle/exercise |
| LP share price | Prototype one LP (team); MTM share price is next step |
| Regulation | Devnet + test USDC only; README sketches licensed non-US path (xStocks) |

### Open question

Does Gemini sandbox accept prediction-market orders? Ask office hours; else paper-trade at live asks.

---

## Acceptance tests

Agents write these **before** the code they test.

### Reference numbers

Inputs: S=$780, T=48/365, σ=16% every strike, rate 0. Math to $0.0001; quotes exact.

| Case | Expected |
|------|----------|
| BS call spread 780/800 | $8.0556 |
| BS put spread 780/740 | $13.6854 |
| Token delta call 780/800 | 0.1697 |
| Token delta put 780/740 | −0.3139 |
| Quote call 780/800 (crowd $6.20 below) | $8.30 |
| Quote put 780/740 (crowd $10.90 below) | $14.10 |
| Sanity: 30-day 780 call | $14.27 |

**Toy Gemini event, r=0.1** — expected coverage 0.876; crowd call 780/800 = $6.20; crowd put 780/740 = $10.90.

| Label | Bid | Ask | Midpoint | Put 780/740 hedge for 44 |
|-------|-----|-----|----------|--------------------------|
| 7,399.99 or below | none | 0.10 | 7,399.99 | 1,760 |
| 7,400 to 7,599.99 | 0.12 | 0.16 | 7,500 | 1,320 |
| 7,600 to 7,799.99 | 0.17 | 0.21 | 7,700 | 440 |
| 7,800 to 7,999.99 | 0.20 | 0.24 | 7,900 | 0 |
| 8,000 to 8,199.99 | 0.09 | 0.13 | 8,100 | 0 |
| 8,200.01 or above | 0.03 | 0.06 | 8,200.01 | 0 |

**Payoff table, K=$780:**

| Settle | Call W=$20 | Put W=$40 |
|--------|------------|-----------|
| $700 | $0 | $40 |
| $740 | $0 | $40 |
| $760 | $0 | $20 |
| $780 | $0 | $0 |
| $790 | $10 | $0 |
| $800 | $20 | $0 |
| $850 | $20 | $0 |

### M1: program (local validator)

- [ ] First deposit $50,000 → 50,000 shares; after $5,000 premium, $10,000 deposit → 9,090.909090 shares (floor)
- [ ] create_series mint: 0 decimals, name `SPY 31DEC26 P 780/740`, series PDA = permanent delegate + mint authority
- [ ] buy 44 puts @ $14.10 → cost $620.40, lock $1,760, OI=44, 44 tokens in wallet
- [ ] buy rejects with named errors for all listed check failures
- [ ] settle matches payoff table; releases OI×(W−payoff)
- [ ] exercise pays 44×$40=$1,760 at $717.60; second exercise no-op; total_locked=0 when done
- [ ] withdraw beyond free USDC → InsufficientFreeLiquidity
- [ ] Invariant holds across 500 random ops
- [ ] Security: non-keeper post_quote fails; wrong feed ID → InvalidOracle; demo/Pyth cross rejected

### M2: pricer (unit)

- [ ] All reference numbers
- [ ] Label parsing for all three shapes
- [ ] Crowd unavailable when coverage < 0.8 or missing ask on positive payoff
- [ ] Hand-built Bought decodes; unknown disc ignored; dupes once
- [ ] Netting: 144 tokens → 1 lot, residual 44
- [ ] Every endpoint validates against API schemas

### M3: integration (devnet)

- [ ] Pricer quote on-chain within 20s
- [ ] Bought → webhook within 10s
- [ ] Demo settle + pay all holders within 2 min of expiry
- [ ] Faucet funds fresh wallet that can buy

### M4: web app

- [ ] Playwright smoke: each screen every state with mocked wallet
- [ ] Every program error shows mapped message
- [ ] Manual: Phantom buy on Buy and Protect

### M5: end to end

- [ ] Demo checklist passes twice from fresh `seed-demo`, once with `--target demo`

---

## Milestones

Submit by **Fri Nov 20, 10 AM CST** (deadline noon). If a gate slips > half day, cut scope rather than push dates.

1. **M0** — interfaces frozen (config, program skeleton, pricer stub)
2. **M1** Sun Nov 15 — program tests pass; deployed to devnet
3. **M2** Sun Nov 15 (parallel) — pricer unit tests pass
4. **M3** Mon Nov 16 — keeper, Stream, faucet live
5. **M4** Tue Nov 17 — web app; all P0 done
6. **M5** Wed Nov 18 — end-to-end; P1 starts after
7. **Thu Nov 19 noon** — feature freeze; README + Devpost + video
8. **Fri Nov 20 10 AM CST** — submit
9. **Sat Nov 21** — finals at UT Austin

### Human setup checklist

- [ ] QuickNode Solana devnet endpoint + Streams API key
- [ ] Vercel + Railway/Render with deploy tokens
- [ ] GitHub repo public by submission
- [ ] Devnet SOL for admin, keeper, LP, faucet, 5 demo buyers
- [ ] Phantom on devnet
- [ ] Confirm Pyth SPY feed ID into config
- [ ] Gemini office hours: sandbox PM orders? sandbox key if yes

### `.env.example` variables

`SOLANA_RPC_URL`, `ODDLOT_PROGRAM_ID`, `ADMIN_KEYPAIR`, `KEEPER_KEYPAIR`, `FAUCET_KEYPAIR`, `TEST_USDC_MINT`, `PRICER_URL`, `KEEPER_URL`, `QUICKNODE_API_KEY`, `QUICKNODE_STREAM_TOKEN`, `GEMINI_API_KEY`, `GEMINI_API_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_PROGRAM_ID`, `NEXT_PUBLIC_PRICER_URL`, `NEXT_PUBLIC_KEEPER_URL`.

---

## Submission deliverables

### README outline

1. Oddlot in one line + demo/live links  
2. Problem and solution (44-share story)  
3. Architecture  
4. Economic design and risk assumptions  
5. How we use Solana  
6. Addresses  
7. How we use Gemini  
8. QuickNode Stream config  
9. Run locally  
10. What's next  

### Draft Devpost answers

- **What did you build?** Oddlot: SPY options in one-share lots, fully backed by USDC on Solana, priced against Wall Street and Gemini.
- **What problem does it solve?** Listed options are 100-share contracts (~$1,400 for SPY); advisors can't protect exactly 44 shares.
- **How does it work?** Anchor locks max payout at mint; Token-2022 options; pricer max(BS, Gemini crowd); QuickNode Streams → hedger nets odd lots to round lots and hedges residuals on Gemini.
- **What makes it unique?** First options vault to price and hedge with a prediction market's full distribution; backed by construction; market-hours guard; auto-exercise.
- **What's next?** More tickers via xStocks/Pyth; hedge-aware collateral; licensed launch outside the US.

### Video shot list (2:30)

0:00 Hook → 0:15 Protect → 0:50 Vault meter → 1:15 Crowd chart → 1:40 Demo shock → 2:10 Architecture

### Sources

- UBC 2026 Hackathon Guide (`docs/hackathon-guide-ubc-2026.md`, `docs/pdfs/Hackathon_Guide_UBC_26.pdf`)
- Gemini Prediction Markets / SPXEND26
- QuickNode Streams docs
- Pyth market hours / Equity.US.SPY/USD
- xStocks on Solana
