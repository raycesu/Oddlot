# Architecture notes

See `PLAN.md` for the system diagram and workstream contracts.

## Solvency boundary

| On-chain (WS1) | Off-chain (WS2/WS3) |
|----------------|---------------------|
| Holds USDC | Prices quotes |
| Locks max payout at mint | Nets odd lots → round lots |
| Market-hours / oracle checks | Gemini / listed / SPYx hedges |
| Auto-exercise | Never custody user funds |

## Event pipeline

`Bought` (program log) → QuickNode Stream filter → `POST /webhook/quicknode` → hedger book update → listed lot print / residual hedge.
