import { pythToUsd1e6 } from "./money.js"

const HERMES = "https://hermes.pyth.network"

export type HermesPrice = {
  usd1e6: bigint
  publishTime: bigint
  updateData: string[]
}

type HermesBody = {
  binary?: { data?: string[] }
  parsed?: {
    price?: { price?: string; expo?: number; publish_time?: number }
  }[]
}

const parseBody = (body: HermesBody): HermesPrice => {
  const price = body.parsed?.[0]?.price
  const updateData = body.binary?.data
  if (!price?.price || price.expo === undefined || price.publish_time === undefined) {
    throw new Error("hermes response is missing a parsed price")
  }
  if (!updateData?.length) {
    throw new Error("hermes response is missing binary update data")
  }
  return {
    usd1e6: pythToUsd1e6(BigInt(price.price), price.expo),
    publishTime: BigInt(price.publish_time),
    updateData,
  }
}

const fetchHermes = async (url: string, apiKey: string): Promise<HermesPrice> => {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    throw new Error(`hermes ${response.status} for ${url.split("?")[0]}`)
  }
  return parseBody((await response.json()) as HermesBody)
}

export const fetchLatestPrice = (feedId: string, apiKey: string): Promise<HermesPrice> => {
  if (!apiKey) {
    throw new Error("PYTH_API_KEY is required to post a Pyth price update")
  }
  return fetchHermes(
    `${HERMES}/v2/updates/price/latest?ids[]=${feedId}&encoding=base64`,
    apiKey,
  )
}

export const fetchPriceAt = (
  feedId: string,
  publishTime: bigint,
  apiKey: string,
): Promise<HermesPrice> => {
  if (!apiKey) {
    throw new Error("PYTH_API_KEY is required to post a Pyth price update")
  }
  return fetchHermes(
    `${HERMES}/v2/updates/price/${publishTime}?ids[]=${feedId}&encoding=base64`,
    apiKey,
  )
}

export const fetchSettleUpdate = async (
  feedId: string,
  expiry: bigint,
  windowS: number,
  apiKey: string,
): Promise<HermesPrice | null> => {
  if (!apiKey) {
    return null
  }
  const end = expiry + BigInt(windowS)
  for (let cursor = expiry; cursor <= end; cursor += 60n) {
    try {
      const update = await fetchPriceAt(feedId, cursor, apiKey)
      if (update.publishTime >= expiry && update.publishTime <= end) {
        return update
      }
    } catch {
      continue
    }
  }
  return null
}

export const feedIdHex = (feedId: string): string => {
  const clean = feedId.replace(/^0x/, "").toLowerCase()
  return `0x${clean}`
}
