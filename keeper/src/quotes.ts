import { usdTo1e6 } from "./money.js"

export type PricerQuote = {
  series: string
  kind: "call" | "put"
  strike: bigint
  width: bigint
  expiry: bigint
  premium: bigint
  bsPremium: bigint
  crowdPremium: bigint
}

type RawQuote = {
  kind?: string
  strike?: string
  width?: string
  expiry?: string
  premium?: string
  bs_premium?: string
  crowd_premium?: string
  series?: string
}

export type QuoteBook = {
  spot: bigint
  quotes: PricerQuote[]
}

const parseUsd = (value: string | undefined): bigint | null => {
  if (!value) {
    return null
  }
  if (value.trim().startsWith("-")) {
    return 0n
  }
  try {
    return usdTo1e6(value)
  } catch {
    return null
  }
}

export const fetchQuoteBook = async (pricerUrl: string): Promise<QuoteBook> => {
  const response = await fetch(`${pricerUrl}/quotes`)
  if (!response.ok) {
    throw new Error(`GET /quotes failed with ${response.status}`)
  }
  const body = (await response.json()) as { spot?: string; quotes?: RawQuote[] }
  if (!body.spot) {
    throw new Error("GET /quotes did not include spot")
  }
  const quotes: PricerQuote[] = []
  for (const quote of body.quotes ?? []) {
    if (quote.kind !== "call" && quote.kind !== "put") {
      continue
    }
    if (!quote.strike || !quote.width || !quote.expiry) {
      continue
    }
    const expiryMs = Date.parse(quote.expiry)
    if (!Number.isFinite(expiryMs)) {
      continue
    }
    const premium = parseUsd(quote.premium)
    const bsPremium = parseUsd(quote.bs_premium)
    const crowdPremium = parseUsd(quote.crowd_premium ?? "0")
    if (premium === null || bsPremium === null || crowdPremium === null || premium <= 0n) {
      continue
    }
    quotes.push({
      series: quote.series ?? "",
      kind: quote.kind,
      strike: usdTo1e6(quote.strike),
      width: usdTo1e6(quote.width),
      expiry: BigInt(Math.floor(expiryMs / 1000)),
      premium,
      bsPremium,
      crowdPremium,
    })
  }
  return { spot: usdTo1e6(body.spot), quotes }
}

export const fetchQuotes = async (pricerUrl: string): Promise<PricerQuote[]> =>
  (await fetchQuoteBook(pricerUrl)).quotes
