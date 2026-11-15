import { Keypair, PublicKey } from "@solana/web3.js"

import {
  buySeries,
  createSeriesIfMissing,
  ensureLpDeposit,
  fetchSeries,
  fetchVault,
  initVaultIfMissing,
  listSeries,
  loadSigners,
  mintTestUsdc,
  nowSeconds,
  postQuote,
  setDemoPrice,
  transferSol,
  type SeriesParams,
} from "./actions.js"
import type { KeeperConfig } from "./config.js"
import { yearEndLegs } from "./grid.js"
import { log } from "./log.js"
import { USD, roundToStep } from "./money.js"
import {
  KIND_CALL,
  KIND_PUT,
  ORACLE_DEMO,
  ORACLE_PYTH,
  feedIdBytes,
  zeroFeed,
  type SeriesView,
  type VaultView,
} from "./pdas.js"
import { getConnection } from "./program.js"
import { fetchQuoteBook, type PricerQuote } from "./quotes.js"
import { writeReplayState } from "./loops/replay-state.js"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const PUT_SIZES = [16n, 14n, 12n, 8n, 6n]
const CALL_SIZES = [10n, 10n, 10n]

export const ensureYearEndGrid = async (config: KeeperConfig): Promise<PublicKey[]> => {
  const signers = loadSigners(config)
  const vault = await initVaultIfMissing(config, signers)
  await ensureLpDeposit(config, signers, vault)
  const book = await fetchQuoteBook(config.pricerUrl)
  const spot = book.spot
  const expiry = BigInt(Math.floor(Date.parse(config.file.year_end.expiry) / 1000))
  const feed = feedIdBytes(config.feedId)
  const addresses: PublicKey[] = []
  for (const leg of yearEndLegs(spot, {
    strikeStep: config.file.year_end.strike_step,
    strikeBandPct: config.file.year_end.strike_band_pct,
    widths: config.file.year_end.widths,
    kinds: config.file.year_end.kinds,
  })) {
    const params: SeriesParams = {
      symbol: config.file.underlying,
      kind: leg.kindCode,
      strike: leg.strike,
      width: leg.width,
      expiry,
      buyCutoffS: config.file.year_end.buy_cutoff_s,
      oracleKind: ORACLE_PYTH,
      feed,
      maxOpenInterest: BigInt(config.file.year_end.max_open_interest),
    }
    addresses.push(await createSeriesIfMissing(config, signers.admin, vault.address, params))
  }
  log("year_end_grid", { count: addresses.length, spot: spot.toString() })
  return addresses
}

const quoteFor = (
  quotes: PricerQuote[],
  kind: "call" | "put",
  strike: bigint,
  width: bigint,
): { premium: bigint; bsPremium: bigint; crowdPremium: bigint } => {
  const match = quotes.find(
    (quote) => quote.kind === kind && quote.strike === strike && quote.width === width,
  )
  if (match) {
    return match
  }
  const fallback = 1n * USD
  return { premium: fallback, bsPremium: fallback, crowdPremium: 0n }
}

const ensureDemoPair = async (
  config: KeeperConfig,
  vault: VaultView,
  spot: bigint,
): Promise<{ call: SeriesView; put: SeriesView; createdAt: bigint; baseSpot: bigint }> => {
  const signers = loadSigners(config)
  const existing = (await listSeries(config, signers.keeper)).filter(
    (series) => series.oracleKind === ORACLE_DEMO && !series.settled && series.expiry > nowSeconds(),
  )
  const strike = roundToStep(spot, config.file.year_end.strike_step)
  const callWidth = 20n * USD
  const putWidth = 40n * USD
  let call: SeriesView | undefined = existing.find(
    (series) => series.kind === KIND_CALL && series.width === callWidth,
  )
  let put: SeriesView | undefined = existing.find(
    (series) => series.kind === KIND_PUT && series.width === putWidth,
  )
  const anchor = call ?? put
  const createdAt = anchor ? anchor.expiry - BigInt(config.file.demo.expiry_after_s) : nowSeconds()
  const expiry = anchor?.expiry ?? createdAt + BigInt(config.file.demo.expiry_after_s)
  const base = {
    symbol: config.file.underlying,
    expiry,
    buyCutoffS: config.file.demo.buy_cutoff_s,
    oracleKind: ORACLE_DEMO,
    feed: zeroFeed(),
    maxOpenInterest: BigInt(config.file.demo.max_open_interest),
  }
  if (!call) {
    const address = await createSeriesIfMissing(config, signers.admin, vault.address, {
      ...base,
      kind: KIND_CALL,
      strike,
      width: callWidth,
    })
    call = (await fetchSeries(config, signers.keeper, address)) ?? undefined
  }
  if (!put) {
    const address = await createSeriesIfMissing(config, signers.admin, vault.address, {
      ...base,
      kind: KIND_PUT,
      strike,
      width: putWidth,
    })
    put = (await fetchSeries(config, signers.keeper, address)) ?? undefined
  }
  if (!call || !put) {
    throw new Error("demo series missing after create")
  }
  return { call, put, createdAt, baseSpot: spot }
}

const topUpBuyer = async (config: KeeperConfig, buyer: Keypair, faucet: Keypair): Promise<void> => {
  const balance = await getConnection(config).getBalance(buyer.publicKey)
  if (balance < 20_000_000) {
    await transferSol(config, faucet, buyer.publicKey, 30_000_000)
  }
  await mintTestUsdc(config, faucet, buyer.publicKey, 2_000n * USD)
}

const buyUntil = async (
  config: KeeperConfig,
  vault: VaultView,
  series: SeriesView,
  buyers: Keypair[],
  sizes: bigint[],
  keeper: Keypair,
  quote: { premium: bigint; bsPremium: bigint; crowdPremium: bigint },
  baseSpot: bigint,
  targetOi: bigint,
): Promise<void> => {
  let cursor = 0
  for (const size of sizes) {
    const buyer = buyers[cursor % buyers.length]
    if (!buyer) {
      throw new Error("no demo buyers")
    }
    const current = await fetchSeries(config, keeper, series.address)
    if (current && current.openInterest >= targetOi) {
      return
    }
    await setDemoPrice(config, keeper, vault.address, baseSpot)
    await postQuote(
      config,
      keeper,
      vault.address,
      series.address,
      quote.premium,
      quote.bsPremium,
      quote.crowdPremium,
    )
    const fresh = await fetchSeries(config, buyer, series.address)
    if (!fresh) {
      throw new Error("series disappeared")
    }
    await buySeries(config, buyer, vault, fresh, size)
    cursor += 1
    if (cursor < sizes.length) {
      await sleep(10_000)
    }
  }
}

export const seedDemo = async (config: KeeperConfig, target: "demo" | "year-end"): Promise<void> => {
  const signers = loadSigners(config)
  await ensureYearEndGrid(config)
  const vault = await fetchVault(config, signers.admin)
  if (!vault) {
    throw new Error("vault missing after seed")
  }
  const book = await fetchQuoteBook(config.pricerUrl)
  const demo = await ensureDemoPair(config, vault, book.spot)
  const quotes = book.quotes
  const strike = demo.put.strike
  const putQuote = quoteFor(quotes, "put", strike, demo.put.width)
  const callQuote = quoteFor(quotes, "call", strike, demo.call.width)
  for (const buyer of signers.buyers) {
    await topUpBuyer(config, buyer, signers.faucet)
  }
  const putSeries = target === "demo" ? demo.put : await yearEndMatch(config, vault, KIND_PUT, strike, demo.put.width)
  const callSeries =
    target === "demo" ? demo.call : await yearEndMatch(config, vault, KIND_CALL, strike, demo.call.width)
  await buyUntil(
    config,
    vault,
    putSeries,
    signers.buyers,
    PUT_SIZES,
    signers.keeper,
    putQuote,
    book.spot,
    56n,
  )
  await buyUntil(
    config,
    vault,
    callSeries,
    signers.buyers,
    CALL_SIZES,
    signers.keeper,
    callQuote,
    book.spot,
    30n,
  )
  writeReplayState(config, {
    createdAt: demo.createdAt.toString(),
    baseSpot: book.spot.toString(),
    series: [demo.call.address.toBase58(), demo.put.address.toBase58()],
  })
  log("seed_demo", { target, call: demo.call.address.toBase58(), put: demo.put.address.toBase58() })
}

const yearEndMatch = async (
  config: KeeperConfig,
  vault: VaultView,
  kind: number,
  strike: bigint,
  width: bigint,
): Promise<SeriesView> => {
  const { keeper } = loadSigners(config)
  const found = (await listSeries(config, keeper)).find(
    (series) =>
      series.vault.equals(vault.address) &&
      series.oracleKind === ORACLE_PYTH &&
      series.kind === kind &&
      series.strike === strike &&
      series.width === width &&
      !series.settled,
  )
  if (!found) {
    throw new Error("year-end series for the demo strike was not created")
  }
  return found
}
