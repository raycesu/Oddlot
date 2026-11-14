<!-- Auto-cleaned from the uploaded PDF. Prefer the structured markdown siblings in docs/ for agent use; use this file if you need page-faithful wording. Wherever this text says AGENTS.md, use .cursor/rules/ in this repo. -->

# Extracted from Fractional_Options.pdf



## Page 1

Overview A short version of the master PRD for the team. Agents build from the master PRD; this page explains
what we're building and why.
Summary Oddlot sells options on SPY in one-share sizes, fully backed by USDC on Solana, and priced against both
Wall Street and Gemini's prediction market.
We enter the DeFi and Onchain Applications track with Best use of Solana, plus the Gemini Prediction Markets and QuickNode Streams bounties.
Pitch: listed options only come in round lots of 100 shares. We sell them in odd lots, then net the odd
lots back into round lots to hedge.
Key decisions • SPY only for now.
It's the one ticker that fits every prize:
Gemini lists S&P markets but nothing on single stocks;
SPY has a tokenized version (SPYx)
and a Pyth price feed on Solana;
and its listed options are the most liquid to net into.
The program supports more tickers later without changes.
• Capped payoffs.
Every token is a call or put spread, so its maximum payout is locked in USDC at mint.
Holders never depend on the hedger.
• Calls and puts from day one.
Puts carry the lead story:
an advisor protects exactly 44 shares.
• Gemini is core.
Its S&P year-end market prices and hedges our year-end series.
Built for the UBC 2026 Hackathon. Submission is due Friday, Nov 20 at noon CST; finals are Saturday, Nov
21 at UT Austin.
Problem and users Listed options trade in 100-share contracts, so one SPY option costs about $1,400 and one S&P 500 index
option about $14,000.
Illustrative 30-day at-the-money calls at 16% volatility, SPY near $780:
Contract Exposure Approx. premium
SPX index option 100 × index (~$780,000) ~$14,300
SPY option 100 shares (~$78,000) ~$1,430
Oddlot token 1 SPY share (~$780) ~$14
The same lumpiness blocks exact hedges: a client with $34,000 in an S&P 500 fund holds about 44 SPY-equivalent shares, and listed puts protect 0 or 100.
Exchanges tried 10-share mini options and dropped them for low volume, so the fix is aggregation, not just a smaller contract.
User Need Screen Wealth advisor with many small accounts (lead story) Protect a client's exact S&P exposure, e.g. 44 shares Protect (puts)
Retail investor S&P upside for $10 to $50 Buy (calls)
Liquidity provider Earn premium on USDC with capped, fully backed risk Vault
Prize strategy If everything lands, the prizes stack to $9,000.


## Page 2

Entry Prize How we qualify
DeFi and Onchain Applications track $2,000 A new primitive (fractional, fully backed options) that composes with Pyth, Token-2022 and Gemini, plus a live solvency dashboard
Best use of Solana $1,500 Anchor program, Token-2022 extensions (metadata, permanent delegate), Pyth pull oracle
Gemini Prediction Markets $2,500 / $1,000 / $500; 1st also pitches at finals Gemini's S&P year-end market prices and hedges our year-end series
QuickNode Streams $500 A Stream on our program feeds the hedger in real time
Official overall winner $2,500 / $1,000 / $500 Automatic with a complete submission
There are four routes into the 13 finalist slots: top DeFi contender, top Solana project in DeFi, top three
overall, or Gemini first place.
We skip ElevenLabs and Grok Bot;
both would read as add-ons.
What makes it win
Five features carry the pitch. Each is visible in the demo and maps to a prize.
Feature What it does Wins
Odd lots in, round lots out The hedger nets small trades per series; every 100 tokens, it buys one listed SPY spread. A live meter shows each bucket filling. DeFi, overall
Crowd-priced, crowd-hedged Turns Gemini's S&P year-end buckets into an option price, quotes the higher of that and Black-Scholes, and hedges leftovers by buying the matching buckets. Gemini first place
Backed by construction The program locks each token's max payout at mint and rejects any buy that would break that. A solvency panel shows 100% coverage live. DeFi (safe to use)
Market-hours guard and auto-exercise No new sales while the stock market is closed. At expiry, every holder is paid automatically through a Token-2022 extension. Best use of Solana
Protect exactly An advisor types a holding; the app buys exactly that many put tokens in one transaction. Product and UX, impact
MVP scope SPY only, calls and puts as capped spreads, cash-settled in a test USDC token we mint (Circle's devnet
faucet is capped at 20 USDC every 2 hours, too little to fund the vault).
Two kinds of series:
• Year-end series:
expires Dec 31, 2026 at 4 PM ET, the same moment Gemini's S&P year-end market resolves.
Strikes every $20 near spot, widths $20 or $40.
• Demo series:
expires minutes after creation on a replay price feed, so judges see settlement live.


## Page 3

Priority What ships P0, by Nov 17 Anchor program (vault, series, buy, settle, auto-exercise, collateral checks); Token-2022 option tokens; Pyth price with market-hours guard; keeper; pricer with Black-Scholes and Gemini crowd price; QuickNode Stream to the hedger; hedger with round-lot netting; web app with Buy, Protect and Vault screens; test-USDC faucet
P1, Nov 18 to 19 Gemini bucket hedge; crowd vs Wall Street chart; LP P&L simulation chart; Postgres trade tape
P2, next steps Fed-decision chip; on-chain delta hedges; more tickers
If we fall behind, cut P2, then the P1 charts, then the Gemini hedge. Never cut the collateral checks,
auto-exercise or the Protect screen.
Architecture The program holds all funds and enforces solvency. Everything off-chain only prices and hedges, so an
off-chain failure can cost LPs edge but never holders' payouts.
system architecture · on-chain, off-chain and hedge markets
1.
Quote:
the pricer computes Black-Scholes and crowd prices;
the keeper posts a quote to each series every 15 seconds.
2.
Buy:
the user signs a buy.
The program checks the market is open, the quote is fresh and limits hold, takes the premium, locks the max payout, and mints tokens.
3.
Stream:
QuickNode delivers the trade event to the hedger.
4.
Hedge:
the hedger buys one listed SPY spread for every 100 tokens on a series.
It hedges leftovers with Gemini buckets on the year-end series and with SPYx on the others.
5.
Settle:
after expiry the keeper settles with the Pyth price and pays every holder.
Unused collateral returns to the vault.


## Page 4

How it gets built
Coding agents build from the master PRD, which has the full specs and tests. The team's job is setup, review and the pitch.
Workstream Builds Built on
WS1 Program Vault, series, buy, settle, auto-exercise Rust + Anchor, Token-2022, Pyth
WS2 Pricer Black-Scholes and crowd pricing, hedger, API Python, FastAPI
WS3 Keeper Quote posting, settlement, demo scripts, QuickNode Stream, test-USDC faucet TypeScript, Node
WS4 Web app Buy, Protect and Vault screens Next.js, Solana wallet adapter
Milestones, each gated by passing tests:
1.
Fri Nov 13:
shared interfaces frozen 2.
Sun Nov 15:
program on devnet;
pricer tested 3.
Mon Nov 16:
keeper, Stream and faucet live 4.
Tue Nov 17:
web app done;
all P0 complete 5.
Wed Nov 18:
full end-to-end run;
P1 work starts 6.
Thu Nov 19, noon:
feature freeze;
README, video and Devpost answers 7.
Fri Nov 20, 10 AM CST:
submit, two hours before the deadline What humans do today: set up QuickNode, hosting and GitHub; fund devnet wallets; confirm the Pyth
SPY feed ID.
The master PRD has the full checklist.
Demo plan The demo succeeds if a judge sees an advisor protect exactly 44 shares, the vault net that into a round
lot, and every holder get paid at expiry with coverage never below 100%.
Pitch outline (5 minutes):
1.
Problem:
a client owns 44 shares;
listed puts cover 0 or 100 (0:30)
2.
Live Protect demo:
buy 44 put tokens (1:00)
3.
Odd lots in, round lots out:
simulated buyers have the meter at 56, and the live buy tips it to 100 (0:45)
4.
Crowd vs Wall Street chart and the Gemini hedge (1:00)
5.
A demo series settles through an 8% price drop;
puts pay in full and wallets get USDC without clicking (1:00)
6.
Backed by construction, and what's next (0:45)
Saturday problem, turned into a feature. Finals fall on a Saturday, when the stock market is closed and
the year-end series refuses sales.
We show that refusal live as the market-hours guard, then run the demo on a short demo series.
The 2:30 submission video is recorded on a weekday with live prices.
Economics and risks Holders carry no counterparty risk, because every token's max payout is locked at mint. Liquidity
providers carry the market risk;
the vault prices it conservatively and hedges it down.
• Pricing:
each quote is the higher of Black-Scholes (using listed SPY implied vol)
and the crowd price from Gemini's buckets, plus a 3% spread.
• Why the Gemini hedge works:
a capped spread is a strip of Gemini buckets.
Because the crowd price uses Gemini's asking prices, buying that strip never costs more than the premium collected.


## Page 5

Risk Mitigation Thin Gemini order books Fall back to Black-Scholes when too few buckets are quoted; cap each year-end series at 500 tokens
Tokens trade 24/7, the stock market doesn't Market-hours guard stops sales when the Pyth price is stale
Big market move LP loss is capped at locked collateral; 80% utilization cap; hedges
Keeper or hedger goes down Funds never leave the program; anyone can trigger settlement and payout
SPY options are securities Devnet and test USDC only; the README sketches a licensed, non-US path like xStocks
Open questions • Does Gemini's sandbox accept prediction-market orders? Ask at office hours (Nov 16 to 19);
if not, the hedge runs as paper trades at live prices.


## Page 6

Master PRD: Oddlot — SPY options in one-share lots
How to use this PRD
This is the master spec for the coding agents that build Oddlot. Humans can stop after MVP scope;
agents read everything.
Copy this section into AGENTS.md at the repo root.
Rules for agents 1.
Source of truth.
The spec sections (Program spec through Web app spec, Acceptance tests, Milestones)
win over the narrative sections above them.
If two spec sections conflict, stop and ask.
2.
Decide, log, continue.
When something is unspecified, pick the simplest option consistent with this PRD.
Record it in DECISIONS.md (date, decision, reason, workstream)
and keep going.
3.
Scope.
Build P0, then P1, in the order of MVP scope.
Add nothing else:
no extra tickers, features, chains or mainnet.
4.
Tests define done.
Write each milestone's acceptance tests first.
A milestone is done only when they pass in CI or a recorded local run.
5.
Frozen interfaces.
The shared config, the program's accounts, instructions and events, and the API schemas are frozen after milestone M0.
To change one, update this spec, every consumer and DECISIONS.md in the same change.
6.
Check live docs.
Use the latest stable Anchor, Pyth, QuickNode and Gemini APIs.
Read their current docs before coding against them;
do not rely on memory.
7.
Never:
commit keypairs, API keys or .env files;
touch mainnet or real funds;
use floating-point math on-chain;
weaken a program check to make a test pass.
8.
Stop and ask a human when you need an account, API key, captcha or faucet;
a frozen interface must change;
an acceptance test cannot pass as written;
or anything would cost real money.
9.
Keep it runnable.
At every milestone, README.md has working commands to build, test and run each part locally.
Summary Oddlot sells options on SPY in one-share sizes, fully backed by USDC on Solana, and priced against both
Wall Street and Gemini's prediction market.
We enter the DeFi and Onchain Applications track with Best use of Solana, plus the Gemini Prediction Markets and QuickNode Streams bounties.
Why SPY only for now: one underlying keeps a five-day build testable, and SPY is the only ticker that fits
every prize we're entering.
Gemini lists S&P markets but nothing on single stocks;
SPY has a tokenized version and a Pyth feed on Solana;
and its listed options are the most liquid to net into.
Each series already carries an underlying field, so more tickers need no program change;
they would be priced with Black-Scholes only.
Pitch: listed options only come in round lots of 100 shares. We sell them in odd lots, then net the odd
lots back into round lots to hedge.
Final decisions for the build:
• Underlying is SPY.
It has the most liquid listed options, a tokenized version on Solana (SPYx), a Pyth price feed, and a matching S&P 500 year-end market on Gemini.
• Payoffs are capped spreads.
Every token's maximum payout is locked in USDC at mint, so holders never depend on the hedger.
• Calls and puts from day one.
Puts carry the lead story:
an advisor protects exactly 44 shares.
• Gemini is core, not a stretch.
Its S&P distribution prices and hedges the year-end series.
Built for the UBC 2026 Hackathon. Submission is due Friday, Nov 20 at noon CST; finals are Saturday, Nov
21 at UT Austin.


## Page 7

Problem Listed options trade in 100-share contracts, so one SPY option costs about $1,400 and one S&P 500 index
option about $14,000.
Illustrative 30-day at-the-money calls at 16% volatility, SPY near $780:
Contract Exposure Approx. premium
SPX index option 100 × index (~$780,000) ~$14,300
SPY option 100 shares (~$78,000) ~$1,430
Oddlot token 1 SPY share (~$780) ~$14
The same lumpiness blocks exact hedges. A client with $34,000 in an S&P 500 fund holds about 44 SPY-equivalent shares, and listed puts protect 0 or 100.
Exchanges tried 10-share mini options and dropped them for low volume, so a smaller contract alone fails;
the fix is aggregation.
Users Lead the pitch with the advisor; retail access is the second story.
User Need Screen Wealth advisor with many small accounts Protect a client's exact S&P exposure, e.g. 44 shares Protect (puts)
Retail investor S&P upside for $10 to $50 Buy (calls)
Liquidity provider Earn premium on USDC with capped, fully backed risk Vault
Prize strategy Enter DeFi and Onchain Applications with Best use of Solana, and opt in to Gemini Prediction Markets
and QuickNode Streams.
If everything lands, the prizes stack to $9,000.
Entry Prize How we qualify Must be in the submission
DeFi and Onchain Applications track $2,000 A new primitive (fractional, fully backed options) that composes with Pyth, Token-2022 and Gemini, plus a live solvency dashboard README on economic design and risk assumptions; every program and account address
Best use of Solana $1,500 Anchor program, Token-2022 extensions (metadata, permanent delegate), Pyth pull oracle, SPL test USDC Program ID; README section on how we use Solana
Gemini Prediction Markets $2,500 / $1,000 / $500; 1st also pitches at finals Gemini's S&P year-end distribution prices and hedges our year-end series Uses the Prediction Markets API
QuickNode Streams $500 A Stream on our program feeds the hedger in real time One Stream with a filter and a destination; README on network, dataset, filter, destination and why


## Page 8

Entry Prize How we qualify Must be in the submission
Official overall winner $2,500 / $1,000 / $500 Automatic A complete submission
There are four routes into the 13 finalist slots: top DeFi contender, top Solana project in DeFi, top three
overall, or Gemini first place.
Skip ElevenLabs and Grok Bot;
both would read as add-ons and pay in perks, not cash.
What makes it win
Five features carry the pitch. Each is visible in the demo and maps to a prize.
Feature What it does Wins
Odd lots in, round lots out The hedger nets fractional demand per series. Every 100 shares the vault is short, it buys one listed SPY contract. A live meter shows each bucket filling. DeFi (capital efficiency), overall (innovation)
Crowd-priced, crowd-hedged Turns Gemini's S&P year-end buckets into an option price and quotes the higher of the crowd and Black-Scholes. Then buys the matching buckets on Gemini as the hedge. Gemini first place
Backed by construction Payoffs are capped, so the program locks the max payout in USDC at mint and rejects any buy that would break that. A solvency panel shows 100% coverage live. DeFi (safe to use)
Market-hours guard and auto-exercise The program refuses new sales when Pyth's SPY price is stale because the market is closed. At expiry the keeper settles and pays every holder through the Token-2022 permanent delegate, like exchange auto-exercise. Best use of Solana
Protect exactly An advisor types a holding in dollars or shares; the app buys that many put tokens in one transaction. Product and UX, impact
MVP scope One underlying (SPY), calls and puts as capped spreads, European exercise, cash-settled in a 6-decimal
test USDC token the team mints (Circle's devnet faucet gives only 20 USDC every 2 hours, too little to fund the vault).
Two kinds of series:
• Year-end series (the hero):
expires Dec 31, 2026 at 4 PM ET, the same moment Gemini's S&P year-end market resolves.
Strikes every $20 within about 8% of spot, widths of $20 or $40, so each strike lines up with Gemini's 200-point SPX buckets.
• Demo series:
expires a few minutes after creation and settles on a replay oracle, so judges see settlement live.
P0 must be done by end of Nov 17; P1 runs Nov 18 to 19; P2 is next steps.
Item Priority Workstream Anchor program: vault, LP deposit and withdraw, series, quotes, buy, settle, exercise, collateral checks P0 WS1 Program


## Page 9

Item Priority Workstream Token-2022 option mints with metadata and permanent delegate P0 WS1 Program
Pyth SPY oracle with market-hours guard; replay oracle for demo series P0 WS1 Program, WS3 Keeper (replay driver)
Keeper: post quotes, settle, auto-exercise, series and seed scripts P0 WS3 Keeper
Pricer: Black-Scholes from listed SPY implied vol, Gemini crowd price, / quotes API P0 WS2 Pricer
QuickNode Stream on the program to the hedger webhook P0 WS3 Keeper (Stream), WS2 Pricer (handler)
Hedger: round-lot netting and residual hedges, paper fills P0 WS2 Pricer
Web app: Buy, Protect and Vault screens P0 WS4 Web app
Gemini bucket hedge: sandbox orders if supported, else paper fills at live asks P1 WS2 Pricer
Crowd vs Wall Street chart P1 WS4 Web app, data from WS2
LP P&L simulation chart across four hedge strategies P1 WS2 Pricer, chart in WS4
Second Stream destination: Postgres for the trade tape P1 WS3 Keeper
Fed-decision chip from Gemini's December Fed market P2 WS2, WS4
Delta hedges as devnet swaps against a mock SPYx pool P2 WS1, WS3
More underlyings (e.g. NVDA, META via xStocks and Pyth) P2 All
If behind, cut in this order: P2, then the P1 charts, then the Gemini hedge. Never cut the collateral
checks, auto-exercise or the Protect screen.
Out of scope: uncapped payoffs, American exercise, mainnet, KYC, real trades in listed options.
Architecture The program holds all funds and enforces solvency. Everything off-chain only prices and hedges, so an
off-chain failure can cost LPs edge but never holders' payouts.


## Page 10

system architecture · on-chain and off-chain components
Buyers and the keeper write to the program; QuickNode streams every program event to the Python
hedger, which nets the book and hedges in three markets.
1.
Quote:
the pricer computes Black-Scholes and crowd prices;
the keeper posts a quote to each series every 15 seconds.
2.
Buy:
the user signs a buy.
The program checks the market is open, the quote is fresh and caps hold, takes the premium, locks width × quantity in USDC, and mints tokens.
3.
Stream:
QuickNode delivers the Bought event to the hedger webhook.
4.
Hedge:
the hedger adds the trade to that series' netting bucket and buys one listed SPY spread for every 100 tokens.
It hedges the odd remainder with Gemini buckets on the year-end series and with SPYx delta on the others.
5.
Settle:
after expiry the keeper calls settle with the Pyth price, then exercise for every holder.
Unused collateral returns to the vault.
Tech stack and repo layout
Use the most common Solana stack, at the latest stable versions; agents make the fewest mistakes there.
Layer Built on Program Rust + Anchor on Solana devnet; Anchor's SPL token-interface library for Token-2022; Pyth Solana receiver crate
Program tests Anchor's test runner on a local validator (TypeScript tests)
Keeper and scripts TypeScript on Node; Anchor TS client generated from the IDL; Pyth Hermes client and Solana receiver SDK
Pricer and hedger Python 3.12, FastAPI, numpy and scipy, yfinance for the listed SPY chain and ^GSPC, httpx for Gemini, SQLite (Postgres in P1)


## Page 11

Layer Built on Web app Next.js (App Router) with TypeScript, Tailwind, shadcn/ ui, Solana wallet adapter (Phantom), Recharts
Hosting Vercel for the web app; Railway or Render for the pricer and keeper (QuickNode needs a public HTTPS webhook)
RPC A QuickNode Solana devnet endpoint (the public devnet RPC is rate-limited)
oddlot/ AGENTS.md rules for agents (copy of How to use this PRD)
PRD.md this document DECISIONS.md log of agent decisions config/ oddlot.json shared config, read by every part programs/ oddlot/ WS1 Rust program tests/ WS1 program tests keeper/ WS3 keeper + scripts (create-series, seed-demo, stream-setup)
pricer/ WS2 FastAPI pricer + hedger + simulator app/ WS4 Next.js web app .env.example every variable, no values Workstreams and frozen interfaces
Four workstreams can run in parallel once milestone M0 freezes their shared contracts. A single agent
works them in the order WS1, WS2, WS3, WS4.
Workstream Builds Needs before starting Hands off
WS1 Program programs/ oddlot ,
tests/ Shared config IDL ( target/ idl/ oddlot.json ), program ID, devnet deployment
WS2 Pricer pricer/ : pricing, hedger, simulator, API Shared config, API schemas, event layouts / quotes, / book, / distribution, /trades, / webhook/ quicknode
WS3 Keeper keeper/ : quote poster, settlement, replay driver, scripts, Stream setup IDL, / quotes Quotes on-chain, settled series, seeded demo, live Stream
WS4 Web app app/ IDL, API schemas Buy, Protect and Vault screens
M0 freezes three things: this config file, a program skeleton whose accounts, instructions and events
match the Program spec (so anchor build emits the final IDL), and a pricer stub returning schema-valid JSON.
WS3 and WS4 build against the IDL and the stub until the real pieces land.
config/ oddlot.json , read by every part (values are the defaults; numbers in dollars unless named
otherwise):
{ "cluster":
"devnet", "underlying":
"SPY", "pyth_feed_id":
"<Equity.US.SPY/ USD id from Pyth's feed list>", "usdc_mint":
"<team test-USDC mint, 6 decimals>", "vault":
{ "max_util_bps":
8000, "quote_max_age_s":
60, "oracle_max_age_s":
60, "settle_window_s":
900, "max_conf_bps":
50 }, "year_end":
{ "expiry":
"2026-12-31T21:00:00Z", "strike_step":
20, "strike_band_pct":
8, "widths":
[20, 40], "kinds":
["call", "put"], "max_open_interest":
500, "buy_cutoff_s":
600 }, "demo":
{ "expiry_after_s":
480, "buy_cutoff_s":
30, "widths":
[20, 40],


## Page 12

"max_open_interest":
2000, "sigma":
0.16, "replay_file":
"config/ replay-shock.json" }, "pricing":
{ "spread":
0.03, "min_premium":
0.05, "rate":
0.0, "crowd_min_coverage":
0.8, "gemini_base":
"https:// api.gemini.com", "gemini_event":
"SPXEND26", "spx_ratio_fallback":
0.1 }, "hedging":
{ "round_lot":
100, "delta_band_shares":
5, "rehedge_interval_s":
60, "spyx_cost_bps":
2 }, "keeper":
{ "quote_interval_s":
15, "settle_poll_s":
60, "exercise_batch":
5 } } The vault account stores its own copies of the vault values at init; the program never reads this file.
Program spec (WS1)
One Anchor program, oddlot , on devnet. All money and prices are u64 in USD × 10^6 (so $780 =
780_000_000).
Times are i64 Unix seconds.
Option mints have 0 decimals:
1 token = an option on 1 share.
No floating point on-chain;
use u128 intermediates and checked math.
Accounts #[account]
pub struct Vault { pub admin:
Pubkey, pub keeper:
Pubkey, pub usdc_mint:
Pubkey, pub usdc_vault:
Pubkey, // token account, PDA ["usdc_vault", vault]
pub lp_mint:
Pubkey, // SPL Token, 6 decimals, authority = vault PDA pub total_locked:
u64, pub max_util_bps:
u16, pub quote_max_age_s:
u32, pub oracle_max_age_s:
u32, pub settle_window_s:
u32, pub max_conf_bps:
u16, pub paused:
bool, pub bump:
u8, } #[account]
pub struct Series { pub vault:
Pubkey, pub underlying:
[u8;
8], // ASCII, zero-padded:
b"SPY\0\0\0\0\0" pub kind:
u8, // 0 = call, 1 = put pub strike:
u64, pub width:
u64, pub expiry:
i64, pub buy_cutoff_s:
u32, // sales stop this many seconds before expiry pub oracle_kind:
u8, // 0 = Pyth, 1 = Demo pub pyth_feed_id:
[u8;
32], pub option_mint:
Pubkey, // Token-2022, PDA ["mint", series]
pub premium:
u64, // per token pub bs_premium:
u64, pub crowd_premium:
u64, // 0 = not available pub quote_ts:
i64, pub open_interest:
u64, // tokens outstanding pub max_open_interest:
u64, pub settle_price:
u64, pub payoff_per_token:
u64, pub settled:
bool, pub bump:
u8, } #[account]
pub struct DemoOracle { pub price:
u64, pub ts:
i64, pub bump:
u8 } // PDA ["demo_oracle", vault]
Vault PDA seeds: ["vault"] . Series PDA seeds: ["series", vault, underlying, [kind],
strike_le, width_le, expiry_le]
.
Adding a ticker later is a new series, not a program change.


## Page 13

Instructions Instruction Signer Checks Effects
init_vault(keeper, limits) Admin Once only Creates Vault, LP mint, USDC vault account and DemoOracle; stores limits from config
deposit(amount) LP amount > 0 Shares = amount if supply is 0, else floor(amount × supply ÷ USDC balance). Moves USDC in, mints shares
withdraw(shares) LP Payout = floor(shares × USDC
balance ÷ supply)
≤ balance − total_locked, else InsufficientFreeLiquidity Burns shares, moves USDC out
create_series(underlying, kind, strike, width, expiry, buy_cutoff_s, oracle_kind, pyth_feed_id, max_oi) Admin width > 0; expiry > now + buy_cutoff_s; for puts width ≤ strike Creates Series and its Token-2022 mint: 0 decimals; metadata pointer and metadata (name like "SPY 31DEC26 P 780/740", symbol "OLSPY"); permanent delegate and mint authority = series PDA
post_quote(premium, bs_premium, crowd_premium) Keeper Not settled; premium > 0 Stores quote, quote_ts = now; emits Quoted
set_demo_price(price) Keeper price > 0 DemoOracle price and ts = now
buy(qty, max_cost) Buyer In order: not Paused; qty > 0 (ZeroQuantity); now < expiry
− buy_cutoff_s (BuyWindowClosed); quote age ≤ quote_max_age_s (QuoteStale); oracle checks below;
OI + qty ≤ max (OpenInterestCap); cost = qty
× premium ≤ max_cost (SlippageExceeded); (total_locked + qty × width) ×
10,000 ≤ (USDC balance + cost) × max_util_bps (UtilizationCap)
Moves cost to the vault; total_locked += qty × width; OI += qty; mints qty to the buyer's Token-2022 account (created if needed); emits Bought
settle Anyone now ≥ expiry (NotExpired); not settled (AlreadySettled); oracle price published within [expiry, expiry + settle_window_s] (SettlePriceOutOfWindow) Stores settle_price and payoff_per_token; total_locked − = OI × (width − payoff); settled = true; emits Settled
exercise Anyone Settled (NotSettled); holder account's mint = series mint (WrongMint); USDC Burns the holder's whole balance via the permanent delegate; pays balance × payoff;
OI − = balance;
total_locked − =


## Page 14

Instruction Signer Checks Effects
destination owned by the same owner balance × payoff; emits Exercised. A zero balance is a no-op
set_paused(paused) Admin None Sets paused
Payoff per token (S = settle price):
call = min(max(S − K, 0), W);
put = min(max(K − S, 0), W).
Integer math, so it is exact.
Oracle checks. Pyth series read a PriceUpdateV2 account owned by the Pyth receiver program. Its feed
ID must equal pyth_feed_id (InvalidOracle);
now − publish_time ≤ oracle_max_age_s (MarketClosed);
conf × 10,000 ≤ max_conf_bps × price (OracleConfidence);
price > 0.
Demo series read DemoOracle with the same age check.
Convert Pyth's (price, expo)
to USD × 10^6:
multiply by 10^(expo + 6)
when expo ≥ − 6, else divide by 10^( − 6 − expo), rounding down.
Invariant , checked by tests after every instruction:
vault USDC balance ≥ total_locked = Σ over unsettled series (OI × width)
+ Σ over settled series (OI × payoff).
Rounding always favors the vault: LP shares and withdrawals round down; premiums arrive pre-rounded
up to the cent from the pricer;
payoffs are exact.
Events Emit with emit! (log lines starting "Program data: "), not emit_cpi! . Each event is an 8-byte
discriminator (first 8 bytes of sha256("event:<Name>"))
followed by the fields in this order:
Pubkey = 32 bytes, u64 and i64 = 8 bytes little-endian.
WS2 decodes these by hand from this layout.
#[event] pub struct Deposited { pub lp: Pubkey, pub amount: u64, pub shares: u64, pub
ts:
i64 } #[event]
pub struct Withdrawn { pub lp:
Pubkey, pub amount:
u64, pub shares:
u64, pub ts:
i64 } #[event]
pub struct Quoted { pub series:
Pubkey, pub premium:
u64, pub bs_premium:
u64, pub crowd_premium:
u64, pub ts:
i64 } #[event]
pub struct Bought { pub buyer:
Pubkey, pub series:
Pubkey, pub qty:
u64, pub cost:
u64, pub spot:
u64, pub ts:
i64 } #[event]
pub struct Settled { pub series:
Pubkey, pub price:
u64, pub payoff_per_token:
u64, pub ts:
i64 } #[event]
pub struct Exercised { pub holder:
Pubkey, pub series:
Pubkey, pub qty:
u64, pub paid:
u64, pub ts:
i64 } Error codes Paused, ZeroQuantity, BuyWindowClosed, QuoteStale, MarketClosed, OracleConfidence, InvalidOracle,
OpenInterestCap, SlippageExceeded, UtilizationCap, InsufficientFreeLiquidity, NotExpired, AlreadySettled, NotSettled, SettlePriceOutOfWindow, InvalidSeriesParams, WrongMint, Unauthorized, MathOverflow.
Security checklist • ☐ Admin and keeper instructions check the signer against vault.admin / vault.keeper ( has_one )
• ☐ Every PDA is derived from its seeds with the stored bump;
no account is trusted by address alone • ☐ Token accounts are checked for mint, owner and token program (SPL Token for USDC, Token-2022 for options)
• ☐ The Pyth account is checked for owner program and feed ID;
demo series cannot read Pyth and the reverse • ☐ All arithmetic uses checked operations with u128 intermediates;
overflow returns MathOverflow • ☐ exercise burns before it pays;
settle and exercise cannot run twice for the same tokens


## Page 15

• ☐ No instruction lets anyone but the program move vault USDC Pricing and hedging spec (WS2)
One FastAPI service prices every series, keeps the hedge book in SQLite, and serves the endpoints below.
Use Python Decimal for money;
floats only inside the option math.
Inputs Input Source Refresh Spot S Latest Pyth SPY price from Hermes; the DemoOracle account for demo series 5 s
Implied vol per strike yfinance SPY chain for the series' expiry date: calls for call strikes, puts for put strikes; linear interpolation in strike; missing strikes use the at-the-money vol. Demo series use
demo.sigma 5 min SPY-to-SPX ratio r Previous close of SPY ÷ previous close of ^GSPC from yfinance; fallback 0.1 Daily
Gemini buckets GET {gemini_base}/ v1/ prediction-markets/ events/
{gemini_event} , public, no key; use only contracts with status active
15 s Black-Scholes T = (expiry − now)
÷ (365 × 86,400), rate 0, no dividends.
Each leg uses its own strike's vol.
At T ≤ 0, use intrinsic value.
\text{call spread} = C(K, \sigma_K)-C(K+W, \sigma_{K+W}) \qquad \text{put spread} =
P(K, \sigma_K)-P(K-W, \sigma_{K-W})
Gemini crowd price (year-end series only)
1.
Parse each contract label (strip commas):
"A to B" has midpoint (A + B + 0.01)
÷ 2;
"A or below" and "A or above" use A.
Example:
"7,800 to 7,999.99" has midpoint 7,900.
2.
Read prices from prices.bestBid and prices.bestAsk :
strings from 0 to 1, each contract paying $1.
3.
Coverage = Σ mids of two-sided buckets ÷ Σ estimates of all buckets (the mid if two-sided, else the one quoted side).
Below crowd_min_coverage , crowd is unavailable.
4.
Crowd price = Σ ask × payoff(r × midpoint).
If any bucket with a positive payoff has no ask, crowd is unavailable.
5.
Display probability for the chart = each bucket's estimate ÷ Σ estimates.
Quote premium = max(min_premium, round up to the cent of (1 + spread) × max(BS, crowd)), treating an
unavailable crowd as 0.
source is "crowd" when crowd > BS, else "bs".
Hedger On startup, rebuild open interest by reading every Series account over RPC; Stream backfill is not
available on the free plan.
Then, on every Bought event:
1.
Round lots.
Per series, residual = OI − 100 × lots_hedged.
While residual ≥ 100, buy one listed spread with the series' strikes (calls:
long K, short K + W;
puts:
long K, short K − W).
Paper-fill at the listed mid, or Black-Scholes if there's no quote.
Increment lots_hedged and log a "lot printed" event for the meter.


## Page 16

2.
Odd remainder, year-end series with crowd available.
Target holding per bucket = residual × payoff(r × midpoint), rounded up to whole contracts.
Trade the difference at bestAsk to buy, bestBid to sell.
3.
Odd remainder, all other series.
Delta-hedge in SPYx.
Token delta:
call spread N(d1(K))
− N(d1(K + W));
put spread N(d1(K))
− N(d1(K − W)), which is negative.
Target SPYx shares = Σ residual × token delta.
Re-hedge every rehedge_interval_s and after each event when the gap exceeds delta_band_shares .
Fill at spot ± spyx_cost_bps .
4.
Settlement.
Listed spreads and Gemini buckets pay their own payoffs at the settle price;
SPYx closes at the settle price.
P&L = premiums − payouts + hedge P&L, marked every minute at Black-Scholes mids.
Simulator (P1). 1,000 SPY paths, geometric Brownian motion at 16% vol, daily steps to the year-end
expiry.
Buyers:
20 trades a day, size uniform from 1 to 50, 60% calls, strikes uniform on the grid, filled at the quote.
Compare four strategies:
no hedge, delta only, round lots + delta, round lots + Gemini (bucket asks = model probability + $0.02).
Output the LP P&L distribution and standard deviation per strategy at GET / simulation.
API schemas All money values are decimal strings in USD; times are ISO 8601 UTC.
GET / quotes { "asof":
"2026-11-16T15:30:00Z", "spot":
"780.00", "quotes":
[ { "series":
"<pubkey>", "underlying":
"SPY", "kind":
"put", "strike":
"780.00", "width":
"40.00", "expiry":
"2026-12-31T21:00:00Z", "premium":
"14.10", "bs_premium":
"13.69", "crowd_premium":
"10.90", "iv":
"0.1600", "source":
"bs" } ] }
GET / book { "asof":
"...", "series":
[ { "series":
"<pubkey>", "open_interest":
144, "lots_hedged":
1, "residual":
44 } ], "listed_spreads":
[ { "series":
"<pubkey>", "qty":
1, "fill":
"13.20", "ts":
"..." } ], "gemini":
[ { "label":
"7,400 to 7,599.99", "contracts":
1320, "avg_price":
"0.16" } ], "spyx_shares":
"-12.40", "pnl":
{ "premiums":
"2030.40", "hedge_mark":
"-120.55", "net":
"1909.85" } } GET / distribution { "event":
"SPXEND26", "r":
"0.1000", "coverage":
"0.88", "buckets":
[ { "label":
"7,800 to 7,999.99", "spy_mid":
"790.00", "crowd_prob":
"0.22", "bs_prob":
"0.25", "bid":
"0.20", "ask":
"0.24" } ] }
GET / trades { "trades":
[ { "signature":
"...", "ts":
"...", "buyer":
"<pubkey>", "series":
"<pubkey>", "kind":
"put", "qty":
44, "cost":
"620.40" } ] }
bs_prob is the Black-Scholes probability of finishing in the same bucket, using the at-the-money vol, so
the two distributions can be drawn side by side.
Keeper and Stream spec (WS3)
The keeper is one Node process with three loops, plus scripts. Every loop and script is safe to re-run,
skipping anything that already exists, and logs JSON lines to stdout.


## Page 17

Loops 1.
Quote poster , every quote_interval_s .
GET / quotes;
for each unsettled, unexpired series, call post_quote when the premium changed or the on-chain quote is older than 30 s.
Convert decimal strings to USD × 10^6 and batch up to 5 per transaction.
If / quotes fails, post nothing:
buys then fail with QuoteStale, which is the safe failure.
2.
Settlement , every settle_poll_s .
For each series past expiry and not settled:
for Pyth series, fetch a Hermes price update with publish time ≥ expiry, post it with the receiver SDK and call settle in the same transaction;
for demo series, call settle directly.
Then find holders with getProgramAccounts on Token-2022, filtering on the mint at offset 0, and call exercise in batches of exercise_batch until open interest is 0.
3.
Replay driver.
Reads config/ replay-shock.json and calls set_demo_price every 5 s, interpolating linearly between points, timed from the demo series' creation.
Runs until every demo series has settled.
Scripts • create-series :
builds the year-end grid from the current Pyth spot:
strikes on multiples of strike_step within strike_band_pct of spot, for each kind and width in config.
• seed-demo :
see Demo seeding and replay.
• stream-setup :
creates the QuickNode Stream through the Streams REST API with the filter below, then prints its configuration for the README.
QuickNode Stream Network: Solana devnet. Dataset: the block dataset that includes transactions and log messages (confirm
its exact name in QuickNode's docs).
Start:
the chain tip.
Destination:
webhook to https:// <pricer host>/ webhook/ quicknode , verified with the Stream's security token per QuickNode's webhook docs.
In P1, add Postgres as a second destination on the same Stream.
Filter sketch; confirm the payload shape with QuickNode's test-filter endpoint before relying on field
names:
function main(stream)
{ const PROGRAM_ID = "<ODDLOT_PROGRAM_ID>";
const out = [];
for (const block of stream.data)
{ for (const tx of block.transactions || [])
{ if (! tx.meta || tx.meta.err)
continue;
const keys = tx.transaction.message.accountKeys.map(k => (typeof k === "string" ? k :
k.pubkey));
if (! keys.includes(PROGRAM_ID))
continue;
const events = (tx.meta.logMessages || [])
.filter(l => l.startsWith("Program data:
"))
.map(l => l.slice("Program data:
".length));
if (events.length)
out.push({ signature:
tx.transaction.signatures[0], slot:
block.slot, blockTime:
block.blockTime, events });
} } return out.length ? { matches:
out } :
null;
} The webhook receives { "matches": [ { "signature", "slot", "blockTime", "events":
["<base64>"] } ] }
.
The pricer verifies the signature, then for each event base64-decodes it, looks up the 8-byte discriminator, and unpacks the fields.
It ignores unknown discriminators (other programs can log in the same transaction), dedupes on (signature, event index), and answers 200 within 1 s, doing the hedge work after replying.
DISC = {hashlib.sha256(f"event:
{n}".encode()).digest()
[:8]:
n for n in ["Deposited", "Withdrawn", "Quoted", "Bought", "Settled", "Exercised"]} raw = base64.b64decode(line)


## Page 18

if DISC.get(raw[:8])
== "Bought":
buyer, series, qty, cost, spot, ts = struct.unpack("<32s32sQQQq", raw[8:104])
Web app spec (WS4)
Three screens behind one header. The price a user pays is always the on-chain premium; the pricer's
numbers are for display only.
Read series and vault state with the Anchor client;
read / book, / distribution and / trades from the pricer, polling every 5 s.
Header, on every screen: Oddlot name, a "Devnet" badge, the wallet button, and a market-status chip
("Market open" or "Market closed · reopens 9:30 AM ET", based on the age of Pyth's SPY price).
Screen Layout and behavior
Buy Series picker: year-end or demo, then call strikes as chips. Price card: "1 share for $8.30 · a listed contract of 100 shares costs about $830". Black-Scholes and crowd price side by side, the higher marked "used". Quantity stepper (default 1), total cost, Buy button. The transaction posts a fresh Pyth update, then calls buy with max_cost = cost × 1.01 rounded up to the cent. Success toast with an explorer link; a list of the user's tokens below
Protect Input: "I hold [dollar amount or shares] of SPY or an S&P 500 fund." Shares = floor(dollars ÷ spot). Floor picker (put strike, default the highest grid strike at or below spot) and width ($20 or $40). Output: "Protects 44 shares from $780 down to $740 until Dec 31." A comparison line: "Listed puts cover 0 or 100 shares. Oddlot covers exactly 44." Cost, then one Buy button
Vault Solvency panel: USDC held, max payout owed (total_locked), coverage = held ÷ max
payout (always ≥ 100%).
LP deposit and withdraw.
A netting meter per series with open interest: a bar filling toward 100, and "lots printed: N". Crowd vs Wall Street chart: grouped bars of crowd_prob and bs_prob per bucket (P1). Trade tape: last 20 trades. LP P&L simulation chart (P1)
States every screen handles: wallet not connected ("Connect a wallet to buy"); no test USDC ("You need
test USDC" plus a "Get test USDC" button calling the keeper's faucet);
market closed (Buy disabled with the message below);
loading (skeletons, never blank numbers).
Map program errors to plain messages:
Error Message MarketClosed Market closed. Sales resume at 9:30 AM ET.
QuoteStale Price is refreshing. Try again in a few seconds.
SlippageExceeded The price moved. Review the new price and try again.
OpenInterestCap This strike is sold out.
UtilizationCap The vault is at capacity right now.
BuyWindowClosed Sales for this series have closed before expiry.
Paused Sales are paused.
Formatting: dollars with 2 decimals and thousands separators; shares as whole numbers; times in ET
with "ET" shown;
series named like "SPY Dec 31 $780/$740 put".
Test-USDC faucet (WS3). The keeper also serves POST / faucet {wallet}. It mints 1,000 test USDC and
sends 0.05 devnet SOL for fees, at most once per wallet per hour, so judges can try the app.


## Page 19

Demo and success criteria
The demo succeeds if a judge sees an advisor protect exactly 44 shares, the vault net that into a round
lot, and every holder get paid at expiry without coverage ever dropping below 100%.
• ☐ Protect:
wallet connects, buys 44 put tokens on the year-end series in one transaction, tokens appear in the wallet • ☐ Buy:
a retail user buys 1 call token for under $20, with Black-Scholes and crowd prices shown • ☐ Netting:
the meter fills, and at 100 shares the book shows one listed SPY contract bought • ☐ Settlement:
a demo series expires;
the keeper settles and auto-exercises;
wallets receive USDC without clicking • ☐ Shock:
the replay oracle drops SPY 8%;
put holders are paid in full and coverage stays at or above 100% • ☐ Guard:
outside market hours the year-end series refuses sales with a clear message • ☐ README:
economic design, risk assumptions, program ID and every address, Solana section, Stream configuration, Gemini usage • ☐ 2 to 3 minute video, recorded on a weekday with live Pyth prices • ☐ 5-minute pitch and 2-minute Q&A rehearsed Finals fall on a Saturday, when Pyth's SPY price is stale. Turn that into a feature: show the guard refusing
a sale live, then run the rest on a demo series.
Pitch outline (5 minutes):
1.
Problem:
a client owns 44 shares;
listed puts cover 0 or 100 (0:30)
2.
Live Protect demo (1:00)
3.
Odd lots in, round lots out:
the netting meter (0:45)
4.
Crowd vs Wall Street chart and the Gemini hedge (1:00)
5.
Saturday guard, then a demo series settles through a price shock (1:00)
6.
Backed by construction, and what's next (0:45)
Demo seeding and replay
keeper/ scripts/ seed-demo sets up a live demo in one command. Run it about 3 minutes before going
on stage;
with expiry_after_s at 480, settlement lands about 4 minutes into the pitch.
1.
Initialize the vault if missing;
mint 50,000 test USDC to the LP wallet and deposit it.
2.
Create the year-end grid if missing ( create-series ).
3.
Create two demo series on the replay oracle at the current spot rounded to $20:
a call with width $20 and a put with width $40.
4.
Simulated buyers:
5 funded wallets buy the target put series in random sizes of 5 to 20 every 10 s until its open interest is 56.
The live Protect buy of 44 then tips it to exactly 100 and prints a lot on stage.
They also buy about 30 calls to fill the trade tape.--target year-end for the weekday video,--target demo for Saturday finals, when the market-hours guard blocks the year-end series.
5.
Start the replay driver.
config/ replay-shock.json uses multiples of the spot at seed time, so it works on any day:
[ { "t": 0, "x": 1.00 }, { "t": 240, "x": 1.00 }, { "t": 300, "x": 0.92 }, { "t":
600, "x":
0.92 } ]
With spot at $780, the price falls to $717.60. The $780/$740 put pays its full $40 per token, the call pays
0, and coverage never drops below 100%.
Economic design and risks
Holders carry no counterparty risk, because every token's max payout is locked at mint. LPs carry the
market risk;
the vault prices it conservatively and hedges it down.


## Page 20

Pricing. Each quote is the higher of two fair values plus a 3% spread. Black-Scholes uses implied vol from
the listed SPY chain at the same strike and expiry.
The crowd price applies only to the year-end series, and is built from Gemini's S&P year-end buckets at their ask prices:
\text{crowd} = \sum_i \text{ask} _i \cdot \text{payoff} (r \cdot m_i) \qquad
\text{quote} = 1.03 \times \max(\text{BS}, \text{crowd})
Here m is a bucket's SPX midpoint (open-ended tail buckets use their edge), and r is the live SPY-to-SPX
ratio, about 0.1.
Each Gemini contract pays $1 if its bucket wins.
Why the crowd hedge works. A capped spread is a strip of buckets. Holding residual × payoff(r · m)
contracts of each bucket covers the odd lots' year-end payout, up to the error from using bucket midpoints.
Because the crowd price uses asks, buying that strip never costs more than the premium collected.
Assumptions: listed implied vol is a fair anchor; hedging costs stay below the 3% spread; SPY tracks SPX /
10 closely enough over seven weeks;
hedge fills are paper trades in the prototype.
Risk Mitigation Thin Gemini books: wide spreads, missing bids Price at asks; fall back to Black-Scholes when under 80% of probability is quoted two-sided; cap year-end open interest at 500 tokens per series
Token trades 24/7, the stock market doesn't Market-hours guard rejects buys when the Pyth price is stale
Oracle staleness or manipulation Age checks; settlement needs a Pyth price published within 15 min after expiry
Large move costs LPs Loss capped at locked collateral; 80% utilization cap; hedges
Keeper or hedger goes down Funds never leave the program; anyone can call settle and exercise
LP share price ignores open positions Prototype has one LP (the team); mark-to-model share price is a next step
Regulation: SPY options are securities Devnet and test USDC only, no outside users; README sketches a licensed, non-US path like xStocks
A real product would also need licensing, brokerage access to trade the listed hedges, outside LP capital,
security audits, and 24/7 risk monitoring.
Acceptance tests Agents write these before the code they test. A milestone is done when all of its tests pass.
Reference numbers Inputs:
S = $780, T = 48 ÷ 365, σ = 16% for every strike, rate 0.
Math must match to $0.0001;
quotes must match exactly.
Case Expected Black-Scholes call spread 780/800 $8.0556
Black-Scholes put spread 780/740 $13.6854
Token delta, call spread 780/800 0.1697


## Page 21

Case Expected Token delta, put spread 780/740 − 0.3139
Quote, call 780/800 (crowd $6.20 below) $8.30
Quote, put 780/740 (crowd $10.90 below) $14.10
Sanity: 30-day 780 call $14.27
Toy Gemini event, r = 0.1:
Label Bid Ask Midpoint Put 780/740 hedge for 44 tokens
7,399.99 or below none 0.10 7,399.99 1,760 contracts
7,400 to 7,599.99 0.12 0.16 7,500 1,320 contracts
7,600 to 7,799.99 0.17 0.21 7,700 440 contracts
7,800 to 7,999.99 0.20 0.24 7,900 0
8,000 to 8,199.99 0.09 0.13 8,100 0
8,200.01 or above 0.03 0.06 8,200.01 0
Expected: coverage 0.876 (passes 0.8); crowd call 780/800 = $6.20; crowd put 780/740 = $10.90.
Payoff per token, K = $780:
Settle price Call, W = $20 Put, W = $40
$700 $0 $40 $740 $0 $40 $760 $0 $20 $780 $0 $0 $790 $10 $0 $800 $20 $0 $850 $20 $0 M1: program (local validator)
• ☐ Deposit:
first deposit of $50,000 mints 50,000 shares.
After $5,000 of premium income, a $10,000 deposit mints 9,090.909090 shares (rounded down)
• ☐ create_series:
mint has 0 decimals, metadata name "SPY 31DEC26 P 780/740", and the series PDA as permanent delegate and mint authority • ☐ buy:
44 put tokens at $14.10 cost $620.40, lock $1,760, set open interest to 44, and put 44 tokens in the buyer's wallet • ☐ buy rejects with the named error:
Paused, ZeroQuantity, BuyWindowClosed, QuoteStale, MarketClosed (stale oracle), OracleConfidence, OpenInterestCap, SlippageExceeded, UtilizationCap • ☐ settle matches the payoff table for every row, for calls and puts, and releases OI × (W − payoff)
• ☐ exercise pays 44 × $40 = $1,760 at a $717.60 settle, burns the tokens, and a second exercise is a no-op;
total_locked is 0 once every holder is paid • ☐ withdraw beyond free USDC fails with InsufficientFreeLiquidity


## Page 22

• ☐ Invariant holds after every step of 500 random deposits, buys, quotes, settles, exercises and withdrawals • ☐ Security:
post_quote from a non-keeper fails;
a Pyth account with the wrong feed ID fails with InvalidOracle;
a demo series rejects a Pyth account and the reverse M2: pricer (unit tests)
• ☐ Every reference number above, from the pricing functions • ☐ Label parsing for all three label shapes • ☐ Crowd is unavailable when coverage < 0.8, and when a bucket with a positive payoff has no ask • ☐ A hand-built Bought event decodes to the right fields;
unknown discriminators are ignored;
duplicates are applied once • ☐ Netting:
144 tokens on one series print 1 lot and leave a residual of 44 • ☐ Every endpoint's response validates against the API schemas M3: integration (devnet)
• ☐ A pricer quote change appears on-chain within 20 s • ☐ A buy's Bought event reaches the webhook within 10 s • ☐ A demo series settles and every holder is paid within 2 minutes of expiry, with no clicks • ☐ The faucet funds a fresh wallet, which can then buy M4: web app • ☐ Playwright smoke test:
each screen renders every state with a mocked wallet • ☐ Every program error shows its mapped message • ☐ Manual:
Phantom on devnet completes a buy on Buy and on Protect M5: end to end
• ☐ The Demo checklist passes twice in a row from a fresh seed-demo , once with--target demo Milestones Submit by Friday, Nov 20 at 10 AM CST, two hours before the noon deadline. If a gate slips by more than
half a day, cut scope in the MVP cut order rather than pushing dates.
1.
M0, Fri Nov 13:
interfaces frozen.
Repo, AGENTS.md , config, program skeleton and pricer stub.
Gate:
anchor build emits an IDL matching the Program spec, and the stub's responses validate against the API schemas.
2.
M1, Sun Nov 15:
program.
Gate:
all M1 tests pass locally;
program deployed to devnet.
3.
M2, Sun Nov 15 (in parallel):
pricer.
Gate:
all M2 tests pass.
4.
M3, Mon Nov 16:
keeper, Stream and faucet live on devnet.
Gate:
all M3 tests pass.
5.
M4, Tue Nov 17:
web app.
Gate:
all M4 tests pass.
All P0 is done.
6.
M5, Wed Nov 18:
end to end.
Gate:
M5 passes.
P1 work starts after.
7.
Thu Nov 19, noon:
feature freeze.
Bug fixes only.
README and Devpost answers final;
video recorded during market hours (9:30 AM to 4 PM ET).
8.
Fri Nov 20, 10 AM CST:
submit.
9.
Sat Nov 21:
finals at UT Austin.
Human setup checklist Agents cannot do these. Finish them on Nov 13 so M0 isn't blocked.
• ☐ QuickNode account:
a Solana devnet endpoint and a Streams API key • ☐ Hosting accounts (Vercel;
Railway or Render)
with deploy tokens for the agents • ☐ GitHub repo, public by submission


## Page 23

• ☐ Devnet SOL for the admin, keeper, LP, faucet and 5 demo-buyer keypairs.
Agents generate the keypairs outside the repo;
a human tops up at faucet.solana.com if CLI airdrops are rate-limited • ☐ Phantom wallet on devnet for the demo • ☐ Pyth SPY feed ID confirmed from Pyth's feed list and pasted into config • ☐ At Gemini office hours:
ask whether the sandbox accepts prediction-market orders;
get a sandbox key if yes .env.example (values never committed):
Variable Used by Notes
SOLANA_RPC_URL Keeper, pricer, scripts QuickNode devnet endpoint
ODDLOT_PROGRAM_ID All From WS1 deploy
ADMIN_KEYPAIR, KEEPER_KEYPAIR, FAUCET_KEYPAIR Keeper, scripts File paths outside the repo
TEST_USDC_MINT All Created by the seed script; faucet keypair is mint authority
PRICER_URL Keeper, web app Public pricer base URL
KEEPER_URL Web app For the faucet
QUICKNODE_API_KEY stream-setup Creates the Stream
QUICKNODE_STREAM_TOKEN Pricer Verifies webhook signatures
GEMINI_API_KEY, GEMINI_API_SECRET Pricer Only for sandbox orders; market data needs no key
DATABASE_URL Pricer SQLite path, Postgres in P1
NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_PROGRAM_ID, NEXT_PUBLIC_PRICER_URL, NEXT_PUBLIC_KEEPER_URL Web app Public values only
Submission deliverables Agents draft all of these from the built system; a human reviews them before Nov 19 at noon.
README outline. Each section maps to a requirement, so judges find it fast.
Section Covers 1. Oddlot in one line Demo video link, live app link
2. Problem and solution The 44-share story
3. Architecture The diagram and the five-step flow
4. Economic design and risk assumptions DeFi track requirement
5. How we use Solana Program ID, Token-2022 extensions, Pyth; Solana award requirement
6. Addresses Program, vault PDA, test USDC mint, every option mint, Pyth feed; DeFi track requirement


## Page 24

Section Covers 7. How we use Gemini Prediction Markets Endpoint, event, crowd price and bucket hedge; Gemini bounty
8. QuickNode Stream Network, dataset, filter logic, destination and why; QuickNode bounty requirement
9. Run it locally Commands for every part
10. What's next More tickers, hedge-aware collateral, licensed launch
Draft Devpost answers • What did you build? Oddlot:
options on SPY in one-share lots, fully backed by USDC on Solana, and priced against both Wall Street and Gemini's prediction market.
• What problem does it solve? Listed options come in 100-share contracts.
One SPY contract costs about $1,400, and an advisor can't protect a client's 44 shares;
listed puts cover 0 or 100.
• How does it work? An Anchor program locks each token's max payout at mint and issues Token-2022 option tokens.
A pricer quotes the higher of Black-Scholes and a price built from Gemini's S&P year-end buckets.
QuickNode Streams sends every trade to a hedger that nets odd lots into listed round lots and hedges the rest on Gemini.
• What makes it unique? It is the first options vault to price and hedge with a prediction market's full distribution.
Odd lots go in and round lots come out.
Every token is backed by construction, sales stop when the stock market closes, and holders are paid automatically.
• What's next? More tickers through xStocks and Pyth, hedge-aware collateral to cut LP capital, and a licensed launch outside the US.
Video shot list (2:30, recorded during market hours, with audio narration)
1.
0:00 Hook:
a client owns 44 shares;
listed puts cover 0 or 100 2.
0:15 Protect:
buy 44 put tokens;
tokens appear in Phantom 3.
0:50 Vault:
the netting meter tips to 100 and a lot prints 4.
1:15 Crowd vs Wall Street chart;
the Gemini hedge in the book 5.
1:40 Demo series:
the shock, auto-exercise, USDC lands, coverage stays 100% 6.
2:10 Architecture and how it uses Solana, QuickNode and Gemini Open questions • Does Gemini's sandbox accept prediction-market orders? Ask at office hours;
if not, paper-trade at live asks.
Sources • UBC 2026 Hackathon Guide and Kickoff deck (attached by Andrew)
• Gemini Prediction Markets: market data and the S&P year-end event (SPXEND26), checked Nov 13, 2026
• QuickNode Streams docs (Solana devnet support; free-trial Solana Streams are real-time only)
• Pyth market hours • xStocks on Solana (Token-2022 with metadata and permanent delegate)