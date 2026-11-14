# UBC 2026 Hackathon Guide

> Canonical hackathon rules for Oddlot agents and humans.
> Source PDF: `docs/pdfs/Hackathon_Guide_UBC_26.pdf`
> Page-faithful cleaned extract: `docs/source/hackathon-guide-pdf-extract.md`

---

## Welcome

University Blockchain Conference hackathon — one week to research, build, and pitch crypto ideas to industry judges.

- **Total prize pool:** $22,000+ cash + sponsor perks
- **Submission:** [ubc-hackathon-2026.devpost.com](https://ubc-hackathon-2026.devpost.com)
- **Telegram:** https://t.me/+Q0hy2P7nbIk2YWIx
- Workshops / office hours: Solana, Circle, and bounty sponsors Nov 16–19

### Event structure

1. Submit to **exactly one** of the three main tracks
2. Optionally enter **as many bounties** as you qualify for (after choosing a track)
3. Within your main track, compete for **one** chain award: Best use of Solana **or** Best use of Arc (never both)
4. Every submission is automatically eligible for Official UBC 2026 Hackathon Winner (1st/2nd/3rd), which stacks with other prizes

---

## Timeline

| Event | When |
|-------|------|
| Kickoff | Thu Nov 12 @ 6:00 PM CST |
| Hackathon start | Thu Nov 12 @ 6:00 PM CST (ignore Devpost Friday noon start — in-person max length is 1 week) |
| Submission deadline | **Fri Nov 20 @ 12:00 PM CST** |
| Workshops / office hours | Nov 16–19 |
| Judging / finals | **Sat Nov 21** (in person, UT Austin) |
| Finalist notification | Fri Nov 20 by 11:59 PM CST |
| Final presentations | Sat Nov 21 during UBC closing |

**Finalist pitch format:** 5 minutes present + 2 minutes Q&A.

Up to **13 finalist slots:**

- 3 teams per main track (top Track Winner contender, Best Solana, Best Arc)
- Top 3 overall Official Winner contenders
- 1st place Gemini bounty team

Teams must be present in person at the closing ceremony to qualify for any prize.

---

## Main tracks (pick exactly one)

### 1. Agentic Payments and AI

AI agents that safely hold, send, and receive stablecoins to pay for APIs, data, and compute.

Recommended: x402, Circle Agent Wallets / Nanopayments, Solana Agent Kit.

**Must:** enable agents to execute onchain txs or read chain (any chain; testnets OK); document decision loop and safety limits.

**Prize:** Track Winner $2,000 (+ optional chain award).

### 2. DeFi and Onchain Applications ← Oddlot

New financial primitives and smart-contract apps: exchanges, lending, yield, derivatives, payment rails.

Objectives: new/improved primitives; compose with existing protocols; safer/more accessible DeFi; optional cross-chain USDC (CCTP).

**Must:**

- Interact with smart contracts on any chain (devnet/testnet OK; own deploy optional)
- Explain **economic design and risk assumptions** in README
- Include addresses of programs/contracts deployed or used

**Prize:** Track Winner $2,000 (+ optional chain award).

### 3. Consumer Applications

Everyday apps where crypto is invisible: payments, social, gaming, creator tools, loyalty.

**Must:** interact with blockchain somehow; working user-facing frontend (web or mobile).

**Prize:** Track Winner $2,000 (+ optional chain award).

---

## Chain awards (pick one, or none)

Judged **within** your main track. Cannot win both Solana and Arc.

### Best use of Solana — $1,500 per track (Oddlot)

Objectives: Anchor or native Rust; Solana-native primitives (SPL, Token Extensions, Solana Pay); integrate existing Solana tooling; smooth wallet UX.

**Must:**

- Core onchain functionality on Solana (devnet OK)
- Include program ID(s) and explain in README how the project uses Solana
- Also submitted to a main track

### Best use of Arc — $1,000 per track

Circle's EVM L1 with USDC as gas. Hardhat/Foundry; Circle tools (Wallets, CCTP, Gateway, Paymaster).

**Must:** core on Arc (testnet OK); contract addresses + README Arc section; main track submission.

---

## Bounties (enter as many as you qualify)

### Gemini Prediction Markets — $2,500 / $1,000 / $500

Build on Gemini prediction market data and/or trading APIs.

Objectives: analytics/visualizations; trading tools/bots/agents; bring PM data into other apps; improve discovery/understanding.

**Must:** use Gemini Prediction Markets API; also in a main track.

### QuickNode Streams — $500

Real-time/historical pipeline to webhooks, Postgres, Snowflake, S3, etc.

Objectives: real-time apps; Streams filters; historical backfill; automated actions from onchain activity.

**Must:**

- Use Streams as a **core** data source
- Configure at least one Stream with a **filter** and a **destination**
- README: network, dataset, filter logic, destination, and why

### ElevenLabs — Scale tier for 3 months / member

Voice/audio as a **core** feature (not add-on). Demo video must show ElevenLabs with audio. README which products.

### Grok Bot — mechanical keyboard + swag / member

Grok Bot does real work as a core part of the project. Include chat export + short README on Grok's role.

**Oddlot skips ElevenLabs and Grok Bot** (would read as add-ons; pay in perks not cash).

---

## How prizes stack

1. Pick ONE main track → Track Winner $2,000
2. Pick ONE chain award (optional) → Solana $1,500 or Arc $1,000
3. Enter any bounties
4. Automatic eligibility for Official Winner ($2,500 / $1,000 / $500)

All stack **except** Best Solana and Best Arc.

**Example (Oddlot path):** DeFi Track Winner $2,000 + Best Solana $1,500 + QuickNode $500 + Official place → up to ~$9,000 with Gemini too.

### Participation prize

Complete working submission at judges' discretion: 1 month ElevenLabs Creator, QuickNode plan perk, X Premium perk (limits apply).

---

## What to submit

- Project name, short description, all team members
- Main track (one), chain award (Solana / Arc / None), every bounty
- Written answers: What did you build? Problem? How does it work? Unique? What's next?
- Technologies / sponsor tools used
- **Public GitHub** with source + setup for work made during the hackathon
- Working demo or deployed app
- 2–3 minute demo video (Drive or YouTube), accessible to judges
- Technical documentation / architecture in README
- Track-specific requirements (addresses, economics, etc.)

### Team composition

Teams of 1–4 recommended; solo welcome; cross-functional encouraged.

---

## Judging

**Across all categories:** Technical execution · Product & UX · Innovation · Impact & potential · Demo quality.

**Process:** screening → shortlist ≤13 finalists → bounty judging by sponsors + UBC → live demos → deliberation → closing ceremony announcement.

Within each main track: UBC picks Track Winner; Solana rep picks Best Solana; Arc rep picks Best Arc. UBC picks Official 1st/2nd/3rd.

Judges' decisions are final. **In-person presence required** for prizes.

---

## FAQ (selected)

- **Pre-existing projects?** No — must be substantially built during the hackathon
- **Multiple main tracks?** No — one only; many bounties OK
- **Need a team?** No
- **AI tools?** Yes, encouraged; still need a working substantive build
- **Participation prize?** Complete submission (repo + README + 2–3 min video); incomplete/minimal effort won't qualify
- **IP?** You retain rights to your code and IP

---

## Resources (from the guide)

**Solana:** Developer Docs, Cookbook, Anchor  
**Circle / EVM:** Circle docs, Arc, CCTP, Wallets, USDC addresses, faucet, Hardhat, Foundry  
**Gemini:** Developer Platform, Prediction Markets overview / getting started / market data / trading quickstart  
**ElevenLabs:** Docs, Agents, SDKs; Discord coupon flow  
**QuickNode Streams:** Quickstart, filters, backfilling, REST API, Solana program data streaming  
**Support:** UBC Telegram; workshops and sponsor Q&A

### Perk redemption notes

- **Cursor / Grok Pro:** log into Grok first, then referral link (account with no prior subscription; limited redemptions)
- **ElevenLabs:** Discord `#│coupon-codes` → Start Redemption → UBC Hackathon event
- **QuickNode:** Credits Guide for hackathon credits

---

## Oddlot mapping (quick reference)

| Devpost choice | Oddlot |
|----------------|--------|
| Main track | DeFi and Onchain Applications |
| Chain award | Best use of Solana |
| Bounties | Gemini Prediction Markets + QuickNode Streams |
| Skip | ElevenLabs, Grok Bot, Arc |
