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
