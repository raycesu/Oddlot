# WS1 — Oddlot program

Anchor program on Solana **devnet**. Program id `AMUpbS3C4pWo1osN91uVzs1rMLxZvUUrJpQVpkPjZd1n`.

## Layout

```text
src/
  lib.rs           program entry
  state.rs         Vault, Series, DemoOracle
  math.rs          payoff, shares, utilization, Pyth scaling
  oracle.rs        Pyth PriceUpdateV2 + demo price checks
  name.rs          series token name
  pda.rs           vault, series, and mint addresses
  events.rs        Deposited … Exercised
  error.rs         OddlotError
  constants.rs     seeds / kind / oracle constants
  instructions/    one file per instruction
tests/m1.rs        LiteSVM acceptance tests
```

```bash
# from repo root, after anchor build
cargo test -p oddlot
```
