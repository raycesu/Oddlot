# WS1 — Oddlot program

Anchor program on Solana **devnet**. Scaffold freezes instruction names, account structs, events, and error codes from `PRD.md`. Handlers return `NotImplemented` until M1.

## Layout

```text
src/
  lib.rs           program entry + instruction exports
  state.rs         Vault, Series, DemoOracle
  events.rs        Deposited … Exercised
  error.rs         OddlotError
  constants.rs     seeds / kind / oracle constants
  instructions/    one file per instruction (stub handlers)
```

## Next (M1)

Wire Token-2022, Pyth receiver, full account metas, collateral math, and acceptance tests under `/tests`.

```bash
# from repo root
anchor build
anchor test
```
