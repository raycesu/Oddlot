# WS3 — Keeper

TypeScript/Node process: quote poster, settlement + auto-exercise, demo replay driver, faucet, and Stream setup scripts.

## Scripts (planned)

| Script | Purpose |
|--------|---------|
| `create-series` | Year-end strike grid from config |
| `seed-demo` | Stage vault + buyers for live demo |
| `stream-setup` | QuickNode Stream → pricer webhook |

Depends on WS1 IDL and WS2 `GET /quotes`. Implementation starts at M3.
