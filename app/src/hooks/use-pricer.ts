"use client"

import { useEffect, useState } from "react"

import {
  fetchBook,
  fetchDistribution,
  fetchQuotes,
  fetchSimulation,
  fetchTrades,
  type BookResponse,
  type DistributionResponse,
  type QuotesResponse,
  type SimulationResponse,
  type TradesResponse,
} from "@/lib/api"

/** PRD says ~5s; 10s cuts hosted-pricer + browser noise when RPC is already busy. */
const POLL_MS = 10_000

export type PricerBundle = {
  quotes: QuotesResponse | null
  book: BookResponse | null
  distribution: DistributionResponse | null
  trades: TradesResponse | null
  simulation: SimulationResponse | null
  isLoading: boolean
  error: string | null
}

export const usePricer = (): PricerBundle => {
  const [quotes, setQuotes] = useState<QuotesResponse | null>(null)
  const [book, setBook] = useState<BookResponse | null>(null)
  const [distribution, setDistribution] = useState<DistributionResponse | null>(null)
  const [trades, setTrades] = useState<TradesResponse | null>(null)
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [nextQuotes, nextBook, nextDistribution, nextTrades, nextSimulation] =
          await Promise.all([
            fetchQuotes(),
            fetchBook(),
            fetchDistribution(),
            fetchTrades(),
            fetchSimulation(),
          ])
        if (cancelled) {
          return
        }
        setQuotes(nextQuotes)
        setBook(nextBook)
        setDistribution(nextDistribution)
        setTrades(nextTrades)
        setSimulation(nextSimulation)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load pricer")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return { quotes, book, distribution, trades, simulation, isLoading, error }
}
