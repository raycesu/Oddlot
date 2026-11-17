# WS3 — Keeper

One Node process posts quotes, settles and exercises, replays the demo price, and serves the faucet. `stream-setup` creates the QuickNode stream that delivers `Bought` logs to the pricer.

## Run

```bash
cd keeper
npm install
npm test
npm run dev
```

`dev` builds with `tsc` and starts:

| Loop | Interval | What it does |
|------|----------|----------------|
| Quotes | 15s | `GET /quotes`, then `post_quote` when the premium changed or the on-chain quote is older than 30s. A failed fetch posts nothing |
| Settle | 60s | Expired series. Demo uses the demo oracle. Year-end uses Hermes Equity.US.VOO/USD when `PYTH_API_KEY` is set |
| Replay | 5s | `set_demo_price` from `config/replay-shock.json`, then settle once the oracle time is inside the settle window |

The same process serves the faucet on port 8787 (`KEEPER_PORT` overrides it).

```bash
curl -s -X POST http://127.0.0.1:8787/faucet \
  -H 'content-type: application/json' \
  -d '{"wallet":"<pubkey>"}'
```

That mints 1,000 test USDC and sends 0.05 SOL, once per wallet per hour.

## Scripts

```bash
npm run create-series
npm run seed-demo -- --target demo
npm run seed-demo -- --target year-end
npm run stream-setup
```

`create-series` builds the **VOO** year-end Pyth grid from pricer spot (`config.underlying` + `pyth_feed_id`). After switching from SPY, re-run it so new PDAs exist; old SPY year-end accounts are left on-chain but unused.

`seed-demo` creates the vault if needed, deposits 50,000 test USDC, builds the year-end grid, and with `--target demo` (the default) creates a call (width $20) and a put (width $40) on the replay oracle. Five buyer wallets then buy until open interest is about 56 puts and 30 calls. Demo settle does not need `PYTH_API_KEY`.

## Stream

`npm run stream-setup` creates or replaces the stream. Do not create it in the QuickNode UI. The account allows one stream, so a terminated stream with this name is deleted first.

| Field | Value |
|-------|--------|
| Name | `oddlot-devnet-program` |
| Network | `solana-devnet` |
| Dataset | `programs_with_logs` |
| Batch | 1 (this dataset rejects a larger batch) |
| Start | Chain tip |
| Filter | Oddlot program id, `Program data:` log lines. Returns `{ matches: [{ signature, slot, blockTime, events }] }` or `null` |
| Destination | `{PRICER_URL}/webhook/quicknode` with header `x-quicknode-token` |

The full `block` dataset terminated on its own. `programs_with_logs` is the dataset that stays up and still carries the program logs the hedger decodes. QuickNode does not set `Content-Type`, so the pricer parses the raw body.

## M3 checks (devnet, 2026-11-14)

| Check | Result |
|-------|--------|
| Quote on-chain within 20s | 28 quotes in 8.4s. Series `13k5ZuGoQGsAek8CDBFsgBDTrZsxtA4d3ZWu7UjnRcBu` |
| `Bought` at the webhook within 10s | Buy `3vXGMY2TCeVGpc7mxHocy4oTtcvajTPHv2oXwSByB36FYx6UTr9evKCBFaczigFep8ry2JP8NRvaydX6WmBADpKf` was in `GET /trades` in 4.7s. Stream `0cefefb2-ae5d-47d4-b4bd-d65536dee78f` stayed active |
| Demo settle and pay holders within 2 min | Open interest 0, 10.4s after expiry |
| Faucet, then a buy | Wallet `G6XAWDidXqL1UQisfqpGUh2CQWRp2rHPEHpYCYLWNJwR` bought after the faucet. Buy `27g3AtUHKaYYMWfoiqrs6255EZQv2YZDt1PEiUA3dbwkUUipp3vgbSrHRyg2bHg8BVxSHoHD6ekecjZjnFEP93v3` |
