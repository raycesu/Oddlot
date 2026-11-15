# WS4 — Web app

Next.js (App Router) + TypeScript + Tailwind + Solana wallet adapter (Phantom via Wallet Standard) + Anchor client.

## Screens (P0)

| Screen | Job |
|--------|-----|
| Buy | Call series picker, BS vs crowd, quantity, buy tx |
| Protect | Exact-share puts for advisors (lead demo: 44 shares) |
| Vault | Solvency panel, LP deposit/withdraw, netting meter, trade tape |

## Run

```bash
cd app
cp .env.example .env.local   # set NEXT_PUBLIC_* and optional PYTH_API_KEY
npm install
npm run dev                  # http://127.0.0.1:3000
```

Needs a live pricer (`NEXT_PUBLIC_PRICER_URL`) and keeper faucet (`NEXT_PUBLIC_KEEPER_URL`). Year-end buys also need `PYTH_API_KEY` for `/api/pyth-latest`. Demo series buys use the on-chain DemoOracle and do not need Pyth.

```bash
npm test          # error-map unit tests
npm run test:e2e  # Playwright smoke (mocked wallet states)
npm run accept    # both
npm run build
```

## Manual M4 gate

Phantom on **devnet**: complete a buy on **Buy** and on **Protect**.
