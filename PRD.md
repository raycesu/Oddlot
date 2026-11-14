# Oddlot PRD index

The **canonical full master PRD** lives at:

**→ [`docs/master-prd.md`](./docs/master-prd.md)**

The **full UBC 2026 hackathon guide** lives at:

**→ [`docs/hackathon-guide-ubc-2026.md`](./docs/hackathon-guide-ubc-2026.md)**

Original PDFs: [`docs/pdfs/`](./docs/pdfs/). Doc index: [`docs/README.md`](./docs/README.md).

Agent rules (replaces the PDF's `AGENTS.md`): [`.cursor/rules/oddlot.mdc`](./.cursor/rules/oddlot.mdc).

---

## One-line summary

Oddlot sells options on SPY in one-share sizes, fully backed by USDC on Solana, priced against Wall Street and Gemini's prediction market.

**Pitch:** listed options only come in round lots of 100. We sell odd lots, then net them back into round lots to hedge.

## Spec authority

1. Spec sections in `docs/master-prd.md` (Program → Web app, Acceptance tests, Milestones) win over narrative.
2. If two spec sections conflict, stop and ask.
3. Unspecified → simplest option consistent with the master PRD; log in `DECISIONS.md`.

## Workstreams (quick)

| WS | Path | Stack |
|----|------|--------|
| WS1 Program | `programs/oddlot`, `tests/` | Rust + Anchor, Token-2022, Pyth |
| WS2 Pricer | `pricer/` | Python 3.12, FastAPI |
| WS3 Keeper | `keeper/` | TypeScript, Node |
| WS4 Web app | `app/` | Next.js, Tailwind, wallet adapter |

Frozen after M0: `config/oddlot.json`, program accounts/instructions/events, `schemas/api/*`.
