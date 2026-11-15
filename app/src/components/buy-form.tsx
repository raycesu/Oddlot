"use client"

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { WalletGate } from "@/components/wallet-gate"
import { TokenList } from "@/components/token-list"
import type { QuoteRow } from "@/lib/api"
import { buyOption } from "@/lib/buy"
import { explorerTxUrl } from "@/lib/config"
import { mapProgramError } from "@/lib/errors"
import { dollarsFrom1e6, formatDollars, formatShares, seriesLabel, shortPremium, strikeChipLabel } from "@/lib/format"
import type { SeriesView, VaultView } from "@/lib/pdas"
import { cn } from "@/lib/utils"
import {
  isBuyWindowOpen,
  isCall,
  isDemoSeries,
  isQuoteFresh,
  isYearEndSeries,
  type TokenHolding,
} from "@/hooks/use-series"
import { useMarketStatus } from "@/hooks/use-market-status"

type Mode = "year-end" | "demo"

type BuyFormProps = {
  series: SeriesView[]
  quotes: QuoteRow[]
  vault: VaultView | null
  usdcBalance: bigint
  holdings: TokenHolding[]
  isLoading: boolean
  onRefresh: () => Promise<void>
}

const matchQuote = (row: SeriesView, quotes: QuoteRow[]): QuoteRow | undefined => {
  const kind = isCall(row) ? "call" : "put"
  const strike = dollarsFrom1e6(row.strike).toFixed(2)
  const width = dollarsFrom1e6(row.width).toFixed(2)
  return quotes.find(
    (quote) =>
      quote.kind === kind &&
      Number.parseFloat(quote.strike) === Number.parseFloat(strike) &&
      Number.parseFloat(quote.width) === Number.parseFloat(width),
  )
}

export const BuyForm = ({
  series,
  quotes,
  vault,
  usdcBalance,
  holdings,
  isLoading,
  onRefresh,
}: BuyFormProps) => {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const market = useMarketStatus()
  const [mode, setMode] = useState<Mode>("demo")
  const [qty, setQty] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const calls = useMemo(() => {
    const filtered = series
      .filter(isCall)
      .filter((row) => (mode === "demo" ? isDemoSeries(row) : isYearEndSeries(row)))
      .filter((row) => isBuyWindowOpen(row) && isQuoteFresh(row))
    return filtered.sort((a, b) => Number(a.strike - b.strike))
  }, [series, mode])

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected =
    calls.find((row) => row.address.toBase58() === selectedKey) ?? calls[0] ?? null

  const quote = selected ? matchQuote(selected, quotes) : undefined
  const premium = selected?.premium ?? 0n
  const bs = quote ? Number.parseFloat(quote.bs_premium) : dollarsFrom1e6(selected?.bsPremium ?? 0n)
  const crowd = quote ? Number.parseFloat(quote.crowd_premium) : dollarsFrom1e6(selected?.crowdPremium ?? 0n)
  const usedSource = crowd >= bs ? "crowd" : "bs"
  const total = premium * BigInt(qty)
  const hasEnoughUsdc = usdcBalance >= total
  const yearEndNeedsOpenMarket = mode === "year-end" && !market.open

  const handleBuy = async () => {
    if (!wallet || !vault || !selected) {
      return
    }
    setIsSubmitting(true)
    try {
      const signature = await buyOption({
        connection,
        wallet,
        vault,
        series: selected,
        qty: BigInt(qty),
      })
      toast.success("Bought", {
        description: seriesLabel(selected),
        action: {
          label: "Explorer",
          onClick: () => window.open(explorerTxUrl(signature), "_blank"),
        },
      })
      await onRefresh()
    } catch (err) {
      toast.error(mapProgramError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="tablist" aria-label="Series mode">
        {(["demo", "year-end"] as Mode[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={mode === item}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize",
              mode === item ? "bg-ink text-white" : "bg-surface text-slate border border-line",
            )}
            onClick={() => {
              setMode(item)
              setSelectedKey(null)
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <WalletGate usdcBalance={usdcBalance} isLoading={isLoading} onFunded={() => void onRefresh()}>
        {yearEndNeedsOpenMarket ? (
          <div
            className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-warn"
            data-testid="market-closed"
          >
            Market closed. Sales resume at 9:30 AM ET.
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-slate">Call strikes</p>
              <div className="flex flex-wrap gap-2" role="listbox" aria-label="Call strikes">
                {calls.length === 0 ? (
                  <p className="text-sm text-muted">No call series found for this mode.</p>
                ) : (
                  calls.map((row) => {
                    const active = selected?.address.equals(row.address)
                    return (
                      <button
                        key={row.address.toBase58()}
                        type="button"
                        role="option"
                        aria-selected={Boolean(active)}
                        className={cn(
                          "rounded-md border px-3 py-1.5 font-mono text-sm tabular-nums",
                          active
                            ? "border-teal bg-teal-soft text-teal"
                            : "border-line bg-surface text-ink hover:border-teal/40",
                        )}
                        onClick={() => setSelectedKey(row.address.toBase58())}
                      >
                        {strikeChipLabel(row.strike)}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {selected ? (
              <div className="rounded-lg border border-line bg-surface p-4" data-testid="price-card">
                <p className="text-lg font-medium text-ink">
                  1 share for {shortPremium(premium)} · a listed contract of 100 shares costs about{" "}
                  {formatDollars(dollarsFrom1e6(premium) * 100)}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className={cn("rounded-md border p-3", usedSource === "bs" && "border-teal bg-teal-soft/40")}>
                    <p className="text-xs uppercase tracking-wide text-muted">Black–Scholes</p>
                    <p className="font-mono text-lg tabular-nums">{formatDollars(bs)}</p>
                    {usedSource === "bs" ? <p className="text-xs font-medium text-teal">used</p> : null}
                  </div>
                  <div className={cn("rounded-md border p-3", usedSource === "crowd" && "border-teal bg-teal-soft/40")}>
                    <p className="text-xs uppercase tracking-wide text-muted">Crowd</p>
                    <p className="font-mono text-lg tabular-nums">{formatDollars(crowd)}</p>
                    {usedSource === "crowd" ? <p className="text-xs font-medium text-teal">used</p> : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-end gap-4">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Quantity</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={qty}
                  onChange={(event) => setQty(Math.max(1, Number.parseInt(event.target.value || "1", 10)))}
                  className="h-10 w-28 rounded-md border border-line bg-surface px-3 font-mono tabular-nums"
                  aria-label="Quantity"
                />
              </label>
              <div>
                <p className="text-xs text-muted">Total</p>
                <p className="font-mono text-lg tabular-nums">{formatDollars(total)}</p>
                {!hasEnoughUsdc ? (
                  <p className="mt-1 text-xs text-warn" data-testid="buy-insufficient-usdc">
                    Need {formatDollars(total)}; wallet has {formatDollars(usdcBalance)}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="teal"
                size="lg"
                disabled={!selected || !vault || isSubmitting || qty < 1 || !hasEnoughUsdc}
                onClick={() => void handleBuy()}
                aria-label="Buy call"
                data-testid="buy-button"
              >
                {isSubmitting ? "Buying…" : `Buy ${formatShares(qty)}`}
              </Button>
            </div>
          </div>
        )}
      </WalletGate>

      <section>
        <h2 className="mb-2 font-display text-xl text-ink">Your tokens</h2>
        <TokenList holdings={holdings} />
      </section>
    </div>
  )
}
