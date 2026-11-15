"use client"

import { useEffect, useState } from "react"

import { marketStatus, type MarketStatus } from "@/lib/market"

export const useMarketStatus = (): MarketStatus => {
  const [status, setStatus] = useState<MarketStatus>(() => marketStatus())

  useEffect(() => {
    const tick = () => setStatus(marketStatus())
    tick()
    const timer = window.setInterval(tick, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return status
}
