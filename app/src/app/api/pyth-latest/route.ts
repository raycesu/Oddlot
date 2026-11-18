import { NextResponse, type NextRequest } from "next/server"

import { appConfig } from "@/lib/config"
import { pythToUsd1e6 } from "@/lib/money"

const HERMES = "https://hermes.pyth.network"

type HermesBody = {
  binary?: { data?: string[] }
  parsed?: {
    price?: { price?: string; expo?: number; publish_time?: number }
  }[]
}

const normalizeFeedId = (raw: string | null): string | null => {
  if (!raw) {
    return appConfig.pythFeedId.replace(/^0x/i, "").toLowerCase()
  }
  const clean = raw.replace(/^0x/i, "").toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    return null
  }
  return clean
}

export const GET = async (request: NextRequest) => {
  const apiKey = process.env.PYTH_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "PYTH_API_KEY is not configured on the web app server" },
      { status: 503 },
    )
  }
  const feedId = normalizeFeedId(request.nextUrl.searchParams.get("feed"))
  if (!feedId) {
    return NextResponse.json({ error: "Invalid Pyth feed id" }, { status: 400 })
  }
  const url = `${HERMES}/v2/updates/price/latest?ids[]=${feedId}&encoding=base64`
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  })
  if (!response.ok) {
    return NextResponse.json(
      { error: `Hermes returned ${response.status}` },
      { status: 502 },
    )
  }
  const body = (await response.json()) as HermesBody
  const price = body.parsed?.[0]?.price
  const updateData = body.binary?.data
  if (!price?.price || price.expo === undefined || price.publish_time === undefined || !updateData?.length) {
    return NextResponse.json({ error: "Hermes response missing price data" }, { status: 502 })
  }
  const usd1e6 = pythToUsd1e6(BigInt(price.price), price.expo)
  return NextResponse.json({
    updateData,
    publishTime: price.publish_time,
    usd: (Number(usd1e6) / 1_000_000).toFixed(2),
    feedId,
  })
}
