# Decisions log

Record agent decisions here when the PRD leaves something unspecified.

| Date | Decision | Reason | Workstream |
|------|----------|--------|------------|
| 2026-11-14 | Use `.cursor/rules/` instead of `AGENTS.md` | This repo is built in Cursor; project rules replace the PRD's AGENTS.md copy | Scaffold |
| 2026-11-14 | Scaffold only at M0 (dirs, config, schemas, empty modules) | Explicit request: architecture scaffolding before backend/frontend implementation | Scaffold |
| 2026-11-14 | Set `pyth_feed_id` to Hermes Equity.US.SPY/USD id `19e09bb8…c11cd5` | Confirmed via Hermes / Pyth forum; human should re-verify before deploy | Config |
| 2026-11-14 | Program ID `AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n` | Generated local keypair at scaffold; keypair stays out of git | WS1 |
| 2026-11-14 | Commit `idl/oddlot.json` copy of build output | Lets WS3/WS4 depend on a frozen IDL path before M1 account metas land | Scaffold |
| 2026-11-14 | Canonical full PRD + hackathon guide live under `docs/` | Agents need complete specs in-repo; root `PRD.md` is an index; PDFs + page extracts kept for fidelity | Docs |
| 2026-11-14 | M0 freeze: `config/oddlot.json`, program account/instruction/event/error shapes, `schemas/api/*` | Shared contracts for WS2–WS4. Account metas are filled by the M1 Accounts structs and regenerated IDL in the same milestone | M0 |
| 2026-11-14 | Keep `program_id` in `config/oddlot.json` | Convenience for WS3/WS4. The program never reads the file | Config |
| 2026-11-14 | `init_vault` keeps flat limit args | Already the instruction signature. Same values as the PRD `limits` bundle, without a nested struct | WS1 |
| 2026-11-14 | M1 tests run on LiteSVM via `cargo test` | Dev-deps were already set. Faster than a new TypeScript mocha harness for math and security cases | WS1 |
| 2026-11-14 | Series token name is `{SYM} {DD}{MON}{YY} {C\|P} {long}/{short}`; symbol `SPY`; uri `https://oddlot.local` | PRD only specifies the put example `SPY 31DEC26 P 780/740`. Calls use long K / short K+W | WS1 |
| 2026-11-14 | Withdraw payout is `floor(shares × balance ÷ supply)` | PRD says rounding favors the vault and does not spell the formula | WS1 |
| 2026-11-14 | Settle window is oracle publish time in `[expiry, expiry + settle_window_s]` | "Oracle in settle window" is about the price timestamp, not the 60s buy staleness check | WS1 |
| 2026-11-14 | Pyth `PriceUpdateV2` is parsed in-program (owner `rec5EKMG…LtFJ`); no receiver SDK in the BPF build | SDK 2.0 matches Anchor 1.x but pulls `solana-program` 5, which is a bad SBF dependency. Layout is checked against the SDK in a host test. Full verification level is not required beyond receiver ownership | WS1 |
| 2026-11-14 | `idl/oddlot.json` stays tracked | Frozen IDL path for WS3/WS4. It is not gitignored | WS1 |
| 2026-11-14 | M1 harness is LiteSVM 0.15.2, with `solana-syscalls` pinned to 4.1.1 | Platform-tools v1.52 emits an SBPF ELF that LiteSVM 0.10 rejects. 0.15 loads it. Syscalls 4.2 needs a newer rustc than this repo's 1.89 pin | WS1 |
| 2026-11-14 | Build and deploy with `anchor build --arch v2` | Anchor 1.2 defaults to SBPF v3. Devnet rejected that ELF because v3 execution is not enabled. v2 passes the M1 tests and the devnet loader | WS1 |
| 2026-11-14 | Devnet deploy uses the public devnet RPC | The configured RPC returned HTTP 413 on the program upload | WS1 |
| 2026-11-14 | Moved 0.75 SOL from the keeper keypair and 0.75 SOL from the faucet keypair to the admin keypair before deploy | Program rent is 2.22274892 SOL. The admin keypair had 1 SOL and the devnet faucet was rate-limited | WS1 |
| 2026-11-14 | M2 tests use fixed fixtures; live Hermes/yfinance/Gemini are injectable | M2 gate is unit-only; network calls must not gate acceptance | WS2 |
| 2026-11-14 | Money as `Decimal`; floats only inside BS/`N(d1)` | Matches PRD WS2 money rule | WS2 |
| 2026-11-14 | Year-end residual hedges are paper fills at asks; no Gemini order API | Gemini bucket orders are P1; paper keeps `/book` honest for M2/M3 | WS2 |
| 2026-11-14 | `/quotes` series list is an in-memory year-end grid around spot from config | Chain discovery waits for M3 keeper; grid is enough for quotes + schema tests | WS2 |
| 2026-11-14 | Coverage = Σ two-sided mid estimates ÷ Σ all bucket estimates | Reproduces PRD toy coverage 0.876; one-sided buckets use ask (or bid) as estimate | WS2 |
| 2026-11-14 | `OFFLINE_PRICER=1` serves toy Gemini + spot 780 | Lets local uvicorn and CI run without API keys | WS2 |
| 2026-11-14 | Host public pricer on Vercel; `pricer/main.py` + `tool.vercel.entrypoint`; ship `pricer/config/` copy | Dashboard Root Directory is `pricer/`; default FastAPI locations miss `oddlot_pricer.api.main`; parent `config/` is outside that root | WS2/M3 |
| 2026-11-14 | On Vercel, default SQLite path is `/tmp/oddlot.db` when `VERCEL=1` | Function FS is read-only; `./oddlot.db` caused `readonly database` and FUNCTION_INVOCATION_FAILED | WS2/M3 |
| 2026-11-14 | Keeper uses Anchor 0.32 and `@solana/web3.js`, compiled with `tsc` then `node dist` | `tsx` follows web3.js source maps into `src/` and breaks `rpc-websockets` on Node 24. The Pyth receiver is loaded with `createRequire` because its ESM build imports `jito-ts` without a `.js` extension | WS3 |
| 2026-11-14 | Faucet is `node:http` on the keeper process, port 8787, CORS `*`, rate limit in `keeper/data/faucet.json` | One process serves the loops and `POST /faucet`. No extra HTTP framework | WS3 |
| 2026-11-14 | `seed-demo` uses the admin keypair as the LP. Buyer and LP files sit next to `ADMIN_KEYPAIR` | The PRD does not name a separate LP signer. Admin already pays for series creation | WS3 |
| 2026-11-14 | Year-end strikes use `GET /quotes` spot, not Hermes | Hermes has required `Authorization: Bearer` since 2026-08-26 and `PYTH_API_KEY` is optional. The grid has to match the pricer's spot | WS3 |
| 2026-11-14 | A negative pricer premium is stored as 0 and that quote is not posted | Black-Scholes can return a negative number. `post_quote` only accepts a positive premium | WS3 |
| 2026-11-14 | Demo series quotes are refreshed from the on-chain premium when `/quotes` has no row | `/quotes` is the year-end grid. Demo series still need a fresh quote so buys stay inside the 30s window | WS3 |
| 2026-11-14 | The replay loop settles once the oracle timestamp is inside `[expiry, expiry + settle_window_s]` | A price posted before expiry fails `SettlePriceOutOfWindow`. Waiting for the 60s poll can miss the 2-minute gate | WS3 |
| 2026-11-14 | Moved 0.55 SOL from the faucet keypair to the admin keypair | `create_series` metadata rent is 0.02 SOL and the admin balance was under that after deploy | WS3 |
| 2026-11-14 | Stream dataset is `programs_with_logs` on `solana-devnet`, batch size 1, name `oddlot-devnet-program` | The full `block` dataset terminated with no error. This dataset's max batch size is 1. The filter keeps `Program data:` logs for the Oddlot program and posts `{ matches }` to the pricer. The plan's one stream slot is the reason a terminated stream is deleted and recreated | WS3 |
| 2026-11-14 | Pricer parses the webhook body itself and does not require `Content-Type: application/json` | QuickNode sends the filter JSON with no content type. FastAPI then rejects the body with 422, retries, and terminates the stream | WS3 |
| 2026-11-14 | WS4 copies PDA/money/buy helpers into `app/src/lib` instead of a shared package | Fastest path for the hackathon; keeper stays the source of truth for crank logic | WS4 |
| 2026-11-14 | App syncs `idl/oddlot.json` + `config/oddlot.json` into `app/src/data` on predev/prebuild | Next.js resolves JSON inside the app tree reliably; sync keeps frozen contracts in sync | WS4 |
| 2026-11-14 | Year-end Pyth updates go through Next route `/api/pyth-latest` with server `PYTH_API_KEY` | Hermes needs a Bearer token; keep the key off the client | WS4 |
| 2026-11-14 | Stub `@pythnetwork/solana-utils` jito via webpack `NormalModuleReplacementPlugin` | `pyth-solana-receiver` pulls `jito-ts` / broken `rpc-websockets` paths into the Next bundle | WS4 |
| 2026-11-14 | Wallet Standard auto-detect (empty adapter list) instead of `@solana/wallet-adapter-wallets` | Avoids WalletConnect/viem tree in the Buy bundle; Phantom still appears | WS4 |
| 2026-11-14 | Protect defaults to demo series mode | Saturday finals use `--target demo`; year-end remains selectable | WS4 |
| 2026-11-14 | Defer P1 Vault charts (crowd vs WS, LP P&L) past M4 | Cut order says P1 charts after Protect; solvency/netting/tape ship in P0 | WS4 |
| 2026-11-15 | Pricer FastAPI enables CORS `*` | Browser on `:3000` fetches `:8000`; without CORS every screen showed `Failed to fetch`. Matches keeper faucet | WS2/WS4 |
| 2026-11-15 | UI labels: Protect→Puts / Put options, Buy→Calls / Call options; routes stay `/protect` and `/buy` | Clearer put vs call signal without breaking URLs, e2e paths, or PRD route refs | WS4 |
| 2026-11-15 | Root README expanded to PRD submission outline + quota notes | Judges need run/economics/addresses/Solana/Gemini/Stream; clarify Vercel pricer vs always-on keeper vs page-open RPC | Docs |
| 2026-11-15 | App RPC: 30s visibility-paused polls + dual RPC (`READ` public, `RPC` for wallet sends) | Cuts QuickNode credit burn when judges leave tabs open; sends can still use QuickNode | WS4 |
| 2026-11-15 | `READ_RPC` falls back to `RPC_URL` (not public); batch `getMultipleAccountsInfo` for USDC+holdings; keep last USDC on 429; pricer poll 10s | Public `api.devnet.solana.com` 429’d under poll; failed `getAccount` was treated as $0 and forced the faucet gate | WS4 |
| 2026-11-15 | Protect screen shows “Your tokens” (same holdings as Calls) | Users buy puts on Puts and had no portfolio list there | WS4 |
| 2026-11-15 | Public app URL https://oddlot-vault.vercel.app; README demo path = Vercel app+pricer, on-demand keeper | Judges open hosted app; operator starts keeper only for live quotes/faucet | Docs |
| 2026-11-16 | P1 Gemini residual hedge is paper at live asks, trading the diff | Spec allows sandbox orders or paper fills. Sandbox keys are still an open human step. Buys fill at the ask; sales fill at the bid | WS2 |
| 2026-11-16 | `GET /simulation` is a new schema; existing quote/book/distribution/trade schemas stay frozen | P1 LP P&L needs a response shape the M0 list did not include | WS2 |
| 2026-11-16 | Postgres trade tape is the pricer `DATABASE_URL`, not a second QuickNode destination | The account has one stream slot, already aimed at the webhook. SQLite remains the default so local runs and tests need no database | WS2 |
