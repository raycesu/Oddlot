import { appConfig } from "./config"

export type QuoteRow = {
  series: string
  underlying: string
  kind: "call" | "put"
  strike: string
  width: string
  expiry: string
  premium: string
  bs_premium: string
  crowd_premium: string
  iv: string
  source: "bs" | "crowd"
}

export type QuotesResponse = {
  asof: string
  spot: string
  quotes: QuoteRow[]
}

export type BookSeriesRow = {
  series: string
  open_interest: number
  lots_hedged: number
  residual: number
}

export type BookResponse = {
  asof: string
  series: BookSeriesRow[]
  listed_spreads: { series: string; qty: number; fill: string; ts: string }[]
  gemini: { label: string; contracts: number; avg_price: string }[]
  spyx_shares: number
  pnl: { premiums: string; hedge_mark: string; net: string }
}

export type DistributionResponse = {
  event: string
  r: string
  coverage: string
  buckets: {
    label: string
    spy_mid: string
    crowd_prob: string
    bs_prob: string
    bid: string | null
    ask: string | null
  }[]
}

export type TradeRow = {
  signature: string
  ts: string
  buyer: string
  series: string
  kind: string
  qty: number
  cost: string
}

export type TradesResponse = {
  trades: TradeRow[]
}

export type FaucetSuccess = {
  wallet: string
  usdc: string
  sol: string
  signature: string
}

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${appConfig.pricerUrl}${path}`, {
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error(`pricer ${path} failed: ${response.status}`)
  }
  return (await response.json()) as T
}

export const fetchQuotes = (): Promise<QuotesResponse> => getJson("/quotes")
export const fetchBook = (): Promise<BookResponse> => getJson("/book")
export const fetchDistribution = (): Promise<DistributionResponse> => getJson("/distribution")
export const fetchTrades = (): Promise<TradesResponse> => getJson("/trades")

export const requestFaucet = async (wallet: string): Promise<FaucetSuccess> => {
  const response = await fetch(`${appConfig.keeperUrl}/faucet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet }),
  })
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (response.status === 429) {
    const retry = Number(body.retry_after_s ?? 3600)
    throw new Error(`Faucet already used. Try again in ${Math.ceil(retry / 60)} minutes.`)
  }
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : `Faucet failed (${response.status})`)
  }
  return body as unknown as FaucetSuccess
}

export type HermesLatest = {
  updateData: string[]
  publishTime: number
  usd: string
}

export const fetchPythUpdate = async (feedId = appConfig.pythFeedId): Promise<HermesLatest> => {
  const clean = feedId.replace(/^0x/i, "").toLowerCase()
  const response = await fetch(`/api/pyth-latest?feed=${encodeURIComponent(clean)}`, {
    cache: "no-store",
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Pyth update failed (${response.status})`)
  }
  return (await response.json()) as HermesLatest
}
