import type { TransactionInstruction } from "@solana/web3.js"

import {
  buildPostQuoteIx,
  fetchVault,
  listSeries,
  loadSigners,
  nowSeconds,
} from "../actions.js"
import { send } from "../chain.js"
import type { KeeperConfig } from "../config.js"
import { log, logError } from "../log.js"
import { ORACLE_DEMO, type SeriesView } from "../pdas.js"
import { fetchQuotes, type PricerQuote } from "../quotes.js"

const STALE_S = 30n

const needsPost = (series: SeriesView, premium: bigint, now: bigint): boolean => {
  if (series.settled || series.expiry <= now || premium <= 0n) {
    return false
  }
  if (series.premium !== premium) {
    return true
  }
  return series.quoteTs === 0n || now - series.quoteTs > STALE_S
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size))
  }
  return out
}

export const postQuotesOnce = async (config: KeeperConfig): Promise<number> => {
  let quotes: PricerQuote[]
  try {
    quotes = await fetchQuotes(config.pricerUrl)
  } catch (error) {
    logError("quotes_unavailable", error)
    return 0
  }
  const { keeper } = loadSigners(config)
  const vault = await fetchVault(config, keeper)
  if (!vault) {
    log("quote_skip", { reason: "vault missing" })
    return 0
  }
  const seriesList = await listSeries(config, keeper)
  const now = nowSeconds()
  const ixs: TransactionInstruction[] = []
  for (const series of seriesList) {
    if (series.settled || series.expiry <= now) {
      continue
    }
    const match = quotes.find(
      (quote) =>
        quote.kind === (series.kind === 0 ? "call" : "put") &&
        quote.strike === series.strike &&
        quote.width === series.width &&
        quote.expiry === series.expiry,
    )
    const premium = match?.premium ?? (series.oracleKind === ORACLE_DEMO ? series.premium : 0n)
    const bs = match?.bsPremium ?? premium
    const crowd = match?.crowdPremium ?? 0n
    if (!match && series.oracleKind !== ORACLE_DEMO) {
      continue
    }
    if (!needsPost(series, premium, now)) {
      continue
    }
    ixs.push(
      await buildPostQuoteIx(config, keeper, vault.address, series.address, premium, bs, crowd),
    )
  }
  let posted = 0
  for (const group of chunk(ixs, 5)) {
    try {
      await send(config, keeper, group, [], "post_quote_batch")
      posted += group.length
    } catch (error) {
      logError("quote_batch_retry", error)
      for (const ix of group) {
        try {
          await send(config, keeper, [ix], [], "post_quote")
          posted += 1
        } catch (oneError) {
          logError("quote_skip", oneError)
        }
      }
    }
  }
  log("quote_tick", { posted, considered: seriesList.length })
  return posted
}
