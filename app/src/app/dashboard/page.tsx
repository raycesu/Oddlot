"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useMemo } from "react"

import { TokenList } from "@/components/token-list"
import { TradeTape } from "@/components/trade-tape"
import { isCall, useSeries } from "@/hooks/use-series"
import { usePricer } from "@/hooks/use-pricer"
import type { TradeRow } from "@/lib/api"
import { formatDollars, formatShares, seriesLabel } from "@/lib/format"
import type { SeriesView } from "@/lib/pdas"

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

const labelForSeries = (seriesHex: string, series: SeriesView[]): string => {
  const match = series.find((row) => toHex(row.address.toBytes()) === seriesHex.toLowerCase())
  return match ? seriesLabel(match) : seriesHex
}

const DashboardPage = () => {
  const { connected, publicKey } = useWallet()
  const seriesState = useSeries()
  const pricer = usePricer()

  const buyerHex = publicKey ? toHex(publicKey.toBytes()) : ""
  const shares = seriesState.holdings.reduce((sum, row) => sum + row.balance, 0n)
  const callCount = seriesState.holdings.filter((row) => isCall(row.series)).length
  const putCount = seriesState.holdings.length - callCount

  const myTrades = useMemo(() => {
    const rows = pricer.trades?.trades ?? []
    if (!buyerHex) {
      return []
    }
    return rows
      .filter((trade) => trade.buyer.toLowerCase() === buyerHex)
      .map(
        (trade): TradeRow => ({
          ...trade,
          series: labelForSeries(trade.series, seriesState.series),
        }),
      )
  }, [buyerHex, pricer.trades, seriesState.series])

  return (
    <div data-testid="dashboard-page">
      <div className="mb-6">
        <h1 className="text-3xl font-medium tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-slate">Your open option tokens and recent buys.</p>
      </div>
      {pricer.error ? <p className="mb-4 text-sm text-danger">{pricer.error}</p> : null}
      {seriesState.error ? <p className="mb-4 text-sm text-danger">{seriesState.error}</p> : null}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-medium tracking-tight text-ink">Positions</h2>
        {seriesState.isLoading ? (
          <div className="space-y-3" data-testid="loading-skeletons" aria-busy="true">
            <div className="h-10 animate-pulse rounded-md bg-line/60" />
            <div className="h-24 animate-pulse rounded-md bg-line/40" />
          </div>
        ) : !connected ? (
          <div
            className="panel panel-dashed px-4 py-8 text-center"
            data-testid="wallet-disconnected"
          >
            <p className="text-slate">Connect a wallet to buy</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="panel p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Positions</p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-ink">{seriesState.holdings.length}</p>
              </div>
              <div className="panel p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Shares</p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-ink">{formatShares(shares)}</p>
              </div>
              <div className="panel p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Calls / puts</p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-ink">
                  {callCount} / {putCount}
                </p>
              </div>
              <div className="panel p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Test USDC</p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-ink">
                  {formatDollars(seriesState.usdcBalance)}
                </p>
              </div>
            </div>
            <TokenList holdings={seriesState.holdings} />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xl font-medium tracking-tight text-ink">Trade history</h2>
        <p className="mb-3 text-sm text-muted">Your buys among the latest 50 trades recorded by the pricer.</p>
        {connected ? <TradeTape trades={myTrades} /> : <p className="text-sm text-muted">Connect a wallet to buy</p>}
      </section>
    </div>
  )
}

export default DashboardPage
