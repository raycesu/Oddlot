# Oddlot

**SPY options in one-share lots**, fully backed by USDC on Solana, priced against Wall Street and Gemini’s prediction market.

Built for **UBC 2026** — DeFi & Onchain Applications · Best use of Solana · Gemini Prediction Markets · QuickNode Streams.

> Listed options only come in round lots of 100 shares. Oddlot sells odd lots (1 share = 1 token), then nets them back into round lots to hedge.

| | |
|--|--|
| **App (hosted)** | https://oddlot-vault.vercel.app → [Puts](https://oddlot-vault.vercel.app/protect) · [Calls](https://oddlot-vault.vercel.app/buy) · [Vault](https://oddlot-vault.vercel.app/vault) |
| **Pricer (hosted)** | https://oddlot-pricer.vercel.app |
| **Program (devnet)** | [`AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n`](https://explorer.solana.com/address/AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n?cluster=devnet) |
| **Cluster** | Solana **devnet** · test USDC only · no mainnet / real funds |

### Try the public demo

1. Open **https://oddlot-vault.vercel.app** (Phantom set to **Devnet**).
2. App + pricer are already on Vercel — no need to run those locally.
3. Before a live demo (buys / fresh quotes / faucet / settle), **start the keeper** (laptop is fine; Railway/Render if you want a public URL). Stop it when idle so you do not burn RPC credits 24/7.
4. Connect wallet → **Puts** (exact-share puts) / **Calls** / **Vault** (deposit, solvency, netting, tape).
5. Add more call/put series later with `keeper` scripts (`create-series`, `seed-demo`) — no app redeploy required.

| Piece | Status | What you do |
|-------|--------|-------------|
| Web app | **Live** on Vercel | https://oddlot-vault.vercel.app |
| Pricer | **Live** on Vercel | Already wired; no action for demos |
| Anchor program | **Live** on devnet | No redeploy for judges |
| Keeper + faucet | **Start only for demos** | `cd keeper && npm run dev` on your laptop, or Railway/Render; then set `NEXT_PUBLIC_KEEPER_URL` on the Vercel app if judges need the faucet from the hosted site |
| QuickNode Stream | Optional / already set up | Webhooks to pricer on matching txs only |

Without the keeper running, users can still open the site and browse Vault/series, but **buys need fresh on-chain quotes** (keeper posts ~every 15s), and the **test USDC faucet** only works when a keeper URL is reachable.

---

## Problem and solution

A client with ~$34k in an S&P fund holds ~**44** SPY-equivalent shares. Listed puts protect **0 or 100**. Oddlot mints **exact-share** capped call/put spreads so an advisor can cover 44 shares in one transaction.

| User | Screen | Job |
|------|--------|-----|
| Advisor | **Puts** (`/protect`) | Buy exact-quantity put spreads |
| Retail | **Calls** (`/buy`) | Buy cheap one-share call spreads |
| LP | **Vault** | Deposit USDC; see solvency, netting, trade tape |

---

## Architecture

```text
Browser (Next.js) ──RPC──► Solana program (vault, series, buy, settle)
       │                         ▲
       │ GET /quotes,/book       │ post_quote / settle / faucet
       ▼                         │
   Pricer (FastAPI) ◄── webhook ── QuickNode Stream (Bought logs)
       │                 ▲
       │                 │
   Hedger nets odd lots ──┘        Keeper (Node) polls pricer + crank
```

1. **Quote** — Pricer computes `max(Black–Scholes, Gemini crowd)` + 3% spread; keeper posts on-chain every ~15s  
2. **Buy** — Program checks market hours, fresh quote, utilization; takes premium; **locks max payout**; mints Token-2022 option tokens  
3. **Stream** — QuickNode delivers `Bought` to the pricer hedger  
4. **Hedge** — Every 100 tokens → one listed SPY spread (paper); leftovers via Gemini (year-end) or SPYx delta  
5. **Settle** — Keeper settles with Pyth (or demo oracle); permanent delegate auto-pays holders

---

## Economic design and risk

- **Capped spreads only.** Each token pays at most `width` USDC (e.g. $40). Max liability = `open interest × width`, locked at mint.  
- **Holders:** No counterparty risk from the hedger — payout is collateralized on-chain. Unsafe buys that would break coverage are rejected.  
- **LPs:** Deposit USDC, earn premiums, bear residual market risk after hedging. Withdrawals limited to free (unlocked) liquidity.  
- **Coverage:** `vault USDC / total_locked` must stay ≥ 100% while open interest is backed.  
- **Quote:** Higher of BS (listed SPY IV) and Gemini crowd, plus 3% spread. Crowd unavailable → BS only.  
- **Devnet / test USDC only.** No mainnet, no real funds, no KYC.

---

## How we use Solana

- **Anchor program** on Solana **devnet** owns vault USDC, series state, quotes, buy, settle, and exercise.  
- **Token-2022** option mints: 0 decimals (1 token = 1 share), metadata, **permanent delegate** for auto-exercise.  
- **Pyth** SPY pull oracle with market-hours / confidence guards for year-end series; **DemoOracle** + replay feed for live settlement demos.  
- **PDAs** for vault, USDC vault, demo oracle, and each series — no trusted off-chain custody of payouts.  
- Wallet UX: Phantom via Wallet Standard on the Next.js app.

---

## Addresses (devnet)

| Account | Address |
|---------|---------|
| Program | `AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n` |
| Vault PDA | `C4FcTKYRXHcu2RGH33Fx2qBdsJHQeZUjB4rNPCSaWpLf` |
| USDC vault PDA | `6MkcaXxGzHfiV9aFaFxpB2p1HpD4udjby7oyz1DnnSh1` |
| Demo oracle PDA | `9oYCZp2LtqnAAQ3cBBtSFidDhmn5rBcDjy9RRjcACpxs` |
| Test USDC mint | `3GQqfzNtHu9EXrn8fwXkeU6FkgC3n9eRJv1VdWK6xAq9` |
| Pyth SPY feed | `19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5` |
| Deploy tx | [`oiav8FAJ…AhQpN`](https://explorer.solana.com/tx/oiav8FAJbeNN9qDBqk4H3eUmkqYUNPZqYaYLBvnBeWixbqtxKA9quC6WBxyxVx5VPBCS2PKwZ4CzsZ2Yw3AhQpN?cluster=devnet) |

LP mint is created at `init_vault` (stored on the Vault account). Series PDAs / option mints are created by `create-series` / `seed-demo`.

---

## How we use Gemini

- Public Prediction Markets API: event **`SPXEND26`** (S&P year-end), base `https://api.gemini.com`.  
- Crowd price = strip of bucket **asks** mapped to the capped spread payoff (SPY↔SPX ratio).  
- Year-end series quote = `max(BS, crowd)`; residuals after round-lot netting are paper-hedged with Gemini buckets (P1 live orders optional).  
- No API key required for market data. Sandbox keys only if placing orders.

---

## QuickNode Stream

Created with `cd keeper && npm run stream-setup` (do **not** create this stream in the QuickNode UI — the account has one stream slot).

| Field | Value |
|-------|--------|
| Name | `oddlot-devnet-program` |
| Network | `solana-devnet` |
| Dataset | `programs_with_logs` |
| Batch | 1 |
| Start | Chain tip |
| Filter | Oddlot program id; keep `Program data:` logs → `{ matches: [...] }` or `null` |
| Destination | `https://oddlot-pricer.vercel.app/webhook/quicknode` (or `{PRICER_URL}/webhook/quicknode`) |
| Why | Deliver `Bought` events to the hedger within seconds so odd lots can net into round lots |

**API usage (important for quotas):**

| Source | When it burns credits | How to stay under limits |
|--------|----------------------|---------------------------|
| **RPC** (app reads) | Series/vault poll ~30s **only while the tab is visible**; paused when hidden | `NEXT_PUBLIC_READ_RPC_URL` or same as `NEXT_PUBLIC_RPC_URL` (avoid public Devnet — it 429s) |
| **RPC** (app sends) | Only on buy / protect / LP txs via wallet adapter | Optional QuickNode on `NEXT_PUBLIC_RPC_URL` for reliable confirmations during demos |
| **RPC** (keeper) | Continuously while `npm run dev` runs (quotes 15s, settle 60s, replay 5s) | Run the keeper **only during demos / seeding**, not 24/7 |
| **Streams** | QuickNode watches the chain; webhooks fire on **matching program txs**, not on every page view | Pause/delete the stream when idle if your plan is tight; recreating is `npm run stream-setup` |
| **Pricer on Vercel** | Invoked on HTTP requests (app polls every 5s **while a tab is open**) + Stream webhooks | Closing the tab stops app→pricer traffic; Stream still only hits on chain activity |

Deploying the app and pricer to Vercel does **not** by itself spam QuickNode. A **always-on keeper** pointed at your QuickNode RPC does.

---

## Run locally (judges / contributors)

### Prerequisites

- Node 20+, npm  
- Python 3.12+  
- Rust + [Anchor](https://www.anchor-lang.com/) (only if rebuilding the program)  
- Phantom wallet set to **Devnet**  
- Optional: Solana CLI for deploy / airdrops  

### Fastest path — use hosted pricer + local app & keeper

```bash
# 0) Root env for the keeper (keypairs stay outside the repo)
cp .env.example .env
# Set at least:
#   SOLANA_RPC_URL=https://api.devnet.solana.com   # or your QuickNode URL
#   ODDLOT_PROGRAM_ID=AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n
#   TEST_USDC_MINT=3GQqfzNtHu9EXrn8fwXkeU6FkgC3n9eRJv1VdWK6xAq9
#   PRICER_URL=https://oddlot-pricer.vercel.app
#   ADMIN_KEYPAIR=...  KEEPER_KEYPAIR=...  FAUCET_KEYPAIR=...
#   QUICKNODE_API_KEY=...  QUICKNODE_STREAM_TOKEN=...   # only for stream-setup
#   PYTH_API_KEY=...   # year-end settle / Hermes

# 1) Keeper — quotes, settle/replay, faucet on :8787
cd keeper && npm install && npm run dev

# 2) Web app — another terminal
cd app
cp .env.example .env.local
# NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com   # or QuickNode for wallet sends
# NEXT_PUBLIC_READ_RPC_URL=https://api.devnet.solana.com  # polling reads (keep public)
# NEXT_PUBLIC_PROGRAM_ID=AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n
# NEXT_PUBLIC_PRICER_URL=https://oddlot-pricer.vercel.app
# NEXT_PUBLIC_KEEPER_URL=http://127.0.0.1:8787
npm install && npm run dev
```

Open **http://127.0.0.1:3000** → **Puts** / **Calls** / **Vault**. Connect Phantom (devnet). Use the in-app faucet if you need test USDC.

Seed a live demo book (with keeper env loaded):

```bash
cd keeper
npm run create-series          # year-end grid if missing
npm run seed-demo -- --target demo
```

### Full local stack (offline pricer)

```bash
cd pricer
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
OFFLINE_PRICER=1 uvicorn oddlot_pricer.api.main:app --reload --port 8000
```

Point `PRICER_URL` / `NEXT_PUBLIC_PRICER_URL` at `http://127.0.0.1:8000`. Offline mode uses the PRD toy Gemini book and spot $780 (no live Hermes/yfinance/Gemini).

### Program build & tests

```bash
anchor build --arch v2
cp target/idl/oddlot.json idl/oddlot.json
cargo test -p oddlot
```

Devnet deploy (only if you intentionally replace the program — rent ~2.23 SOL):

```bash
set -a && source .env && set +a
solana program deploy target/deploy/oddlot.so \
  --program-id target/deploy/oddlot-keypair.json \
  --url https://api.devnet.solana.com \
  --keypair "$ADMIN_KEYPAIR"
```

### App / keeper / pricer tests

```bash
cd app && npm test && npm run test:e2e
cd ../keeper && npm test
cd ../pricer && source .venv/bin/activate && pytest
```

### Public hosting (current)

| Service | Host | Status |
|---------|------|--------|
| Web app | Vercel (`app/`) → https://oddlot-vault.vercel.app | **Deployed** — env: `NEXT_PUBLIC_PRICER_URL=https://oddlot-pricer.vercel.app`, public/optional QuickNode RPC, `NEXT_PUBLIC_READ_RPC_URL` public; add `NEXT_PUBLIC_KEEPER_URL` when the keeper has a public URL; `PYTH_API_KEY` optional (year-end only) |
| Pricer | Vercel (`pricer/`) → https://oddlot-pricer.vercel.app | **Deployed** |
| Keeper | Laptop during the pitch, or Railway/Render | **On-demand** — same `.env` as local; keep it off when idle |

**Demo checklist:** open the app URL → start keeper → connect Phantom (devnet) → buy puts / use vault. Seed extra series anytime with `npm run create-series` / `npm run seed-demo` from `keeper/`.

---

## Repo map

| Path | Workstream |
|------|------------|
| `.cursor/rules/` | Agent rules |
| `docs/master-prd.md` | Canonical product + tech spec |
| `docs/hackathon-guide-ubc-2026.md` | UBC rules / prizes |
| `config/` | Shared `oddlot.json` + demo replay |
| `schemas/api/` | Frozen pricer HTTP shapes |
| `idl/oddlot.json` | Program IDL |
| `programs/oddlot/` | WS1 Anchor program |
| `pricer/` | WS2 FastAPI pricer + hedger |
| `keeper/` | WS3 keeper, faucet, Stream setup |
| `app/` | WS4 Next.js Puts / Calls / Vault |
| `DECISIONS.md` | Agent decision log |

More detail: [`PLAN.md`](./PLAN.md) · [`PRD.md`](./PRD.md) · [`docs/README.md`](./docs/README.md) · GitHub: https://github.com/raycesu/Oddlot

---

## What's next

- Gemini bucket hedge at live asks · crowd vs Wall Street chart · LP P&L sim (P1)  
- More underlyings via xStocks + Pyth · hedge-aware collateral · licensed non-US path  

**Never:** mainnet, real funds, keypairs/API keys in git, floating-point math on-chain.
