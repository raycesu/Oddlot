"use client"

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { WalletGate } from "@/components/wallet-gate"
import { buyOption } from "@/lib/buy"
import { explorerTxUrl } from "@/lib/config"
import { mapProgramError } from "@/lib/errors"
import { dollarsFrom1e6, formatDollars, formatEtDate, formatShares, seriesLabel, shortPremium } from "@/lib/format"
import { KIND_PUT, type SeriesView, type VaultView } from "@/lib/pdas"
import { cn } from "@/lib/utils"
import { isDemoSeries, isYearEndSeries } from "@/hooks/use-series"
import { useMarketStatus } from "@/hooks/use-market-status"

type HoldMode = "shares" | "dollars"
type SeriesMode = "year-end" | "demo"

type ProtectFormProps = {
  series: SeriesView[]
  spot: number
  vault: VaultView | null
  usdcBalance: bigint
  isLoading: boolean
  onRefresh: () => Promise<void>
}

export const ProtectForm = ({
  series,
  spot,
  vault,
  usdcBalance,
  isLoading,
  onRefresh,
}: ProtectFormProps) => {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const market = useMarketStatus()
  const [seriesMode, setSeriesMode] = useState<SeriesMode>("demo")
  const [holdMode, setHoldMode] = useState<HoldMode>("shares")
  const [holdValue, setHoldValue] = useState("44")
  const [widthDollars, setWidthDollars] = useState(40)
  const [strikeKey, setStrikeKey] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const puts = useMemo(
    () =>
      series
        .filter((row) => row.kind === KIND_PUT)
        .filter((row) => (seriesMode === "demo" ? isDemoSeries(row) : isYearEndSeries(row)))
        .sort((a, b) => Number(b.strike - a.strike)),
    [series, seriesMode],
  )

  const widths = useMemo(() => {
    const set = new Set(puts.map((row) => Math.round(dollarsFrom1e6(row.width))))
    return [...set].sort((a, b) => a - b)
  }, [puts])

  const shares =
    holdMode === "shares"
      ? Math.max(0, Math.floor(Number.parseFloat(holdValue) || 0))
      : spot > 0
        ? Math.max(0, Math.floor((Number.parseFloat(holdValue) || 0) / spot))
        : 0

  const defaultStrike = useMemo(() => {
    if (!puts.length) {
      return null
    }
    const byWidth = puts.filter((row) => Math.round(dollarsFrom1e6(row.width)) === widthDollars)
    const pool = byWidth.length ? byWidth : puts
    if (spot > 0) {
      const atOrBelow = pool.filter((row) => dollarsFrom1e6(row.strike) <= spot)
      if (atOrBelow.length) {
        return atOrBelow[0]
      }
    }
    return pool[0]
  }, [puts, spot, widthDollars])

  const selected =
    puts.find((row) => row.address.toBase58() === strikeKey) ??
    defaultStrike ??
    null

  const strike = selected ? dollarsFrom1e6(selected.strike) : 0
  const width = selected ? dollarsFrom1e6(selected.width) : widthDollars
  const floor = Math.max(0, strike - width)
  const total = selected ? selected.premium * BigInt(shares) : 0n
  const marketBlocks = seriesMode === "year-end" && !market.open

  const handleBuy = async () => {
    if (!wallet || !vault || !selected || shares < 1) {
      return
    }
    setIsSubmitting(true)
    try {
      const signature = await buyOption({
        connection,
        wallet,
        vault,
        series: selected,
        qty: BigInt(shares),
      })
      toast.success(`Protected ${formatShares(shares)} shares`, {
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
        {(["demo", "year-end"] as SeriesMode[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={seriesMode === item}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize",
              seriesMode === item ? "bg-ink text-white" : "border border-line bg-surface text-slate",
            )}
            onClick={() => {
              setSeriesMode(item)
              setStrikeKey(null)
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <WalletGate usdcBalance={usdcBalance} isLoading={isLoading} onFunded={() => void onRefresh()}>
        {marketBlocks ? (
          <div
            className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-warn"
            data-testid="market-closed"
          >
            Market closed. Sales resume at 9:30 AM ET.
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-slate">
                I hold of SPY or an S&amp;P 500 fund
              </p>
              <div className="flex flex-wrap gap-2">
                {(["shares", "dollars"] as HoldMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm capitalize",
                      holdMode === mode ? "bg-ink text-white" : "border border-line bg-surface text-slate",
                    )}
                    onClick={() => setHoldMode(mode)}
                    aria-pressed={holdMode === mode}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                step={holdMode === "shares" ? 1 : 0.01}
                value={holdValue}
                onChange={(event) => setHoldValue(event.target.value)}
                className="mt-3 h-11 w-full max-w-xs rounded-md border border-line bg-surface px-3 font-mono text-lg tabular-nums"
                aria-label={holdMode === "shares" ? "Shares held" : "Dollars held"}
              />
              {holdMode === "dollars" ? (
                <p className="mt-1 text-sm text-muted">
                  = {formatShares(shares)} shares at spot {formatDollars(spot)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Put strike</span>
                <select
                  className="h-10 rounded-md border border-line bg-surface px-3 font-mono"
                  value={selected?.address.toBase58() ?? ""}
                  onChange={(event) => setStrikeKey(event.target.value)}
                  aria-label="Put strike"
                >
                  {puts
                    .filter((row) => Math.round(dollarsFrom1e6(row.width)) === widthDollars)
                    .map((row) => (
                      <option key={row.address.toBase58()} value={row.address.toBase58()}>
                        ${Math.round(dollarsFrom1e6(row.strike))}
                      </option>
                    ))}
                </select>
              </label>
              <div>
                <p className="mb-1 text-sm text-muted">Width</p>
                <div className="flex gap-2">
                  {(widths.length ? widths : [20, 40]).map((widthOption) => (
                    <button
                      key={widthOption}
                      type="button"
                      className={cn(
                        "rounded-md px-3 py-2 font-mono text-sm",
                        widthDollars === widthOption
                          ? "bg-teal-soft text-teal"
                          : "border border-line bg-surface",
                      )}
                      onClick={() => {
                        setWidthDollars(widthOption)
                        setStrikeKey(null)
                      }}
                      aria-pressed={widthDollars === widthOption}
                    >
                      ${widthOption}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selected && shares > 0 ? (
              <div className="rounded-lg border border-line bg-surface p-4" data-testid="protect-summary">
                <p className="text-lg text-ink">
                  Protects {formatShares(shares)} shares from ${Math.round(strike)} down to $
                  {Math.round(floor)} until {formatEtDate(selected.expiry)}.
                </p>
                <p className="mt-2 text-sm text-slate">
                  Listed puts cover 0 or 100 shares. Oddlot covers exactly {formatShares(shares)}.
                </p>
                <p className="mt-3 font-mono text-sm text-muted">
                  Cost {shortPremium(total)} · on-chain {shortPremium(selected.premium)} / share
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              variant="teal"
              size="lg"
              disabled={!selected || !vault || shares < 1 || isSubmitting}
              onClick={() => void handleBuy()}
              aria-label="Buy protection"
              data-testid="protect-buy-button"
            >
              {isSubmitting ? "Buying…" : `Buy ${formatShares(shares)} puts`}
            </Button>
          </div>
        )}
      </WalletGate>
    </div>
  )
}
